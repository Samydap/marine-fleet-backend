import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { CriminalActualizadoEvent } from '../../../shared/domain/events/eventos.contracts';
import { STORAGE_PORT, type StoragePort } from '../../../shared/domain/storage/storage.port';
import type { Criminal } from '../domain/criminal.entity';
import {
  CRIMINAL_REPOSITORY,
  type CriminalRepositoryPort,
} from '../domain/criminal.repository.port';
import { publicarEvento } from './publicar-evento';

export interface CambiarFotoInput {
  readonly criminalId: string;
  readonly contenido: Buffer;
  readonly mime: string;
  readonly usuarioId: string;
}

export const MIMES_FOTO: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export const TAMANO_MAXIMO_FOTO = 2 * 1024 * 1024;

/**
 * RF-1 (foto en el registro) + RF-2 (el cartel se actualiza al cambiar la foto).
 *
 * La foto no se guarda en la base: va al almacenamiento (STORAGE_PORT) y en la
 * columna `criminales.foto` queda solo la referencia { url, mime, tamano }.
 * Se valida el contenido real del archivo (firma), no solo el mime declarado.
 */
@Injectable()
export class CambiarFotoCriminalUseCase implements UseCase<CambiarFotoInput, Criminal> {
  constructor(
    @Inject(CRIMINAL_REPOSITORY) private readonly repositorio: CriminalRepositoryPort,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: CambiarFotoInput): Promise<Criminal> {
    const extension = MIMES_FOTO[input.mime];
    if (!extension) {
      throw new DomainError('La foto debe ser JPG, PNG o WEBP.', 'FOTO_FORMATO_INVALIDO');
    }
    if (input.contenido.length === 0 || input.contenido.length > TAMANO_MAXIMO_FOTO) {
      throw new DomainError('La foto debe pesar entre 1 byte y 2 MB.', 'FOTO_TAMANO_INVALIDO');
    }
    if (!coincideFirma(input.contenido, input.mime)) {
      throw new DomainError(
        'El contenido del archivo no corresponde a una imagen del tipo declarado.',
        'FOTO_CONTENIDO_INVALIDO',
      );
    }

    const criminal = await this.repositorio.buscarPorId(input.criminalId);
    if (!criminal) {
      throw new NotFoundError('criminal', input.criminalId);
    }

    const archivo = await this.storage.guardar(
      `fotos/${criminal.id}/${randomUUID()}.${extension}`,
      input.contenido,
      input.mime,
    );
    criminal.cambiarFoto(
      { url: archivo.url, mime: archivo.mime, tamano_bytes: archivo.tamanoBytes },
      input.usuarioId,
    );
    const guardado = await this.repositorio.guardar(criminal);

    const evento: CriminalActualizadoEvent = {
      criminalId: guardado.id,
      usuarioId: input.usuarioId,
      motivos: ['FOTO'],
    };
    await publicarEvento(this.eventos, EVENTOS.CRIMINAL_ACTUALIZADO, evento);

    return (await this.repositorio.buscarPorId(guardado.id)) ?? guardado;
  }
}

/** Firma binaria (magic bytes) de cada formato aceptado. */
function coincideFirma(contenido: Buffer, mime: string): boolean {
  if (mime === 'image/jpeg') return contenido[0] === 0xff && contenido[1] === 0xd8;
  if (mime === 'image/png') return contenido.subarray(0, 4).toString('hex') === '89504e47';
  if (mime === 'image/webp') {
    return (
      contenido.subarray(0, 4).toString('ascii') === 'RIFF' &&
      contenido.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}
