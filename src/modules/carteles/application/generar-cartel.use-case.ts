import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { CartelGeneradoEvent } from '../../../shared/domain/events/eventos.contracts';
import { STORAGE_PORT, type StoragePort } from '../../../shared/domain/storage/storage.port';
import {
  CRIMINAL_READER,
  type CriminalReaderPort,
} from '../../criminales/domain/criminal.repository.port';
import { CARTEL_RENDERER, type CartelRendererPort } from '../domain/cartel-renderer.port';
import { Cartel, MotivoGeneracion } from '../domain/cartel.entity';
import { CARTEL_REPOSITORY, type CartelRepositoryPort } from '../domain/cartel.repository.port';
import { construirInstantanea, mismaInstantanea } from '../domain/instantanea-cartel';
import { siguienteVersion } from '../domain/politica-versionado';
import { ColaPorClave } from './cola-por-clave';

export interface GenerarCartelInput {
  readonly criminalId: string;
  readonly motivo: MotivoGeneracion;
  readonly usuarioId: string | null;
  /** MANUAL fuerza version nueva aunque los datos no hayan cambiado. */
  readonly forzar?: boolean;
}

export interface ResultadoGeneracion {
  readonly cartel: Cartel;
  /** false cuando se reutilizo la version vigente (no habia cambios). */
  readonly generado: boolean;
}

/**
 * RF-2. Genera una version nueva del cartel de un criminal:
 *   resumen del criminal -> instantanea -> PDF -> almacenamiento -> version nueva
 *   (la anterior deja de ser vigente) -> evento CARTEL_GENERADO.
 *
 * Idempotente: si la instantanea es igual a la vigente, devuelve la vigente.
 * Serializado por criminal: dos eventos simultaneos no chocan con el numero de version.
 */
@Injectable()
export class GenerarCartelUseCase implements UseCase<GenerarCartelInput, ResultadoGeneracion> {
  private readonly cola = new ColaPorClave();

  constructor(
    @Inject(CARTEL_REPOSITORY) private readonly carteles: CartelRepositoryPort,
    @Inject(CRIMINAL_READER) private readonly criminales: CriminalReaderPort,
    @Inject(CARTEL_RENDERER) private readonly renderer: CartelRendererPort,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly eventos: EventEmitter2,
  ) {}

  execute(input: GenerarCartelInput): Promise<ResultadoGeneracion> {
    return this.cola.ejecutar(input.criminalId, () => this.generar(input));
  }

  private async generar(input: GenerarCartelInput): Promise<ResultadoGeneracion> {
    const resumen = await this.criminales.obtenerResumen(input.criminalId);
    if (!resumen) {
      throw new NotFoundError('criminal', input.criminalId);
    }

    const datos = construirInstantanea(resumen);
    const vigente = await this.carteles.buscarVigente(input.criminalId);

    if (!input.forzar && vigente && mismaInstantanea(vigente.datosInstantanea, datos)) {
      return { cartel: vigente, generado: false };
    }

    const numeroVersion = siguienteVersion(vigente?.numeroVersion ?? null);
    const { contenido, mime } = await this.renderer.renderizar(datos, 'pdf');
    const archivo = await this.storage.guardar(
      `carteles/${input.criminalId}/v${numeroVersion}.pdf`,
      contenido,
      mime,
    );

    const cartel = new Cartel();
    cartel.id = randomUUID();
    cartel.criminalId = input.criminalId;
    cartel.numeroVersion = numeroVersion;
    cartel.vigente = true;
    cartel.archivo = { url: archivo.url, mime: archivo.mime, tamano_bytes: archivo.tamanoBytes };
    cartel.datosInstantanea = { ...datos };
    cartel.motivoGeneracion = input.motivo;
    cartel.generadoPor = input.usuarioId;

    const guardado = await this.carteles.guardarNuevaVersion(cartel);

    const evento: CartelGeneradoEvent = {
      cartelId: guardado.id,
      criminalId: guardado.criminalId,
      numeroVersion: guardado.numeroVersion,
      motivo: guardado.motivoGeneracion,
    };
    this.eventos.emit(EVENTOS.CARTEL_GENERADO, evento);

    return { cartel: guardado, generado: true };
  }
}
