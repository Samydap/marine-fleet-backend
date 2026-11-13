import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { ConcurrencyError } from '../../../shared/domain/errors/concurrency.error';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { CriminalActualizadoEvent } from '../../../shared/domain/events/eventos.contracts';
import type { CambiosDatosCriminal, Criminal } from '../domain/criminal.entity';
import {
  CRIMINAL_REPOSITORY,
  type CriminalRepositoryPort,
} from '../domain/criminal.repository.port';
import { normalizarNombre } from '../domain/services/normalizador-nombre';
import { publicarEvento } from './publicar-evento';

export interface ActualizarCriminalInput {
  readonly criminalId: string;
  readonly version: number;
  readonly cambios: CambiosDatosCriminal;
  readonly usuarioId: string;
}

/**
 * RF-1 "modificar el registro de un criminal".
 *
 * Concurrencia optimista: si otra base edito el registro despues de que este
 * usuario lo leyo, la `version` ya no coincide y se responde 409 en lugar de
 * pisar el cambio ajeno en silencio.
 *
 * Si no cambio nada, no se guarda ni se emite evento (evita carteles inutiles).
 */
@Injectable()
export class ActualizarCriminalUseCase implements UseCase<ActualizarCriminalInput, Criminal> {
  constructor(
    @Inject(CRIMINAL_REPOSITORY) private readonly repositorio: CriminalRepositoryPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: ActualizarCriminalInput): Promise<Criminal> {
    const criminal = await this.repositorio.buscarPorId(input.criminalId);
    if (!criminal) {
      throw new NotFoundError('criminal', input.criminalId);
    }
    if (Number(criminal.version) !== Number(input.version)) {
      throw new ConcurrencyError('criminal', input.criminalId, input.version);
    }

    if (input.cambios.nombre !== undefined) {
      await this.validarNombreLibre(criminal, input.cambios.nombre);
    }

    const motivos = criminal.actualizarDatos(input.cambios, input.usuarioId);
    if (motivos.length === 0) {
      return criminal;
    }
    criminal.nombreNormalizado = normalizarNombre(criminal.nombre);

    const guardado = await this.repositorio.guardar(criminal);

    const evento: CriminalActualizadoEvent = {
      criminalId: guardado.id,
      usuarioId: input.usuarioId,
      motivos,
    };
    await publicarEvento(this.eventos, EVENTOS.CRIMINAL_ACTUALIZADO, evento);

    return (await this.repositorio.buscarPorId(guardado.id)) ?? guardado;
  }

  private async validarNombreLibre(criminal: Criminal, nombre: string): Promise<void> {
    const normalizado = normalizarNombre(nombre);
    if (normalizado === criminal.nombreNormalizado) return;

    const otro = await this.repositorio.buscarPorNombreNormalizado(normalizado);
    if (otro && otro.id !== criminal.id) {
      throw new DomainError(
        `Ya existe un criminal registrado con ese nombre (id ${otro.id}).`,
        'CRIMINAL_DUPLICADO',
        { idExistente: otro.id },
      );
    }
  }
}
