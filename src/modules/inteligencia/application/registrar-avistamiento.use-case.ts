import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { AvistamientoRegistradoEvent } from '../../../shared/domain/events/eventos.contracts';
import {
  CRIMINAL_READER,
  type CriminalReaderPort,
} from '../../criminales/domain/criminal.repository.port';
import {
  Avistamiento,
  EstadoVerificacion,
  OrigenAvistamiento,
} from '../domain/avistamiento.entity';
import {
  AVISTAMIENTO_REPOSITORY,
  type AvistamientoRepositoryPort,
} from '../domain/avistamiento.repository.port';
import { parsearFechaHora } from '../domain/fecha-hora';
import { ZONA_CATALOGO, type ZonaCatalogoPort } from '../domain/zona-catalogo.port';
import { exigirCriminal, textoOpcional, validarZona } from './validaciones';

export interface DatosAvistamientoInput {
  readonly criminalId: string;
  /** `YYYY-MM-DDTHH:mm` (datetime-local) o ISO. */
  readonly fechaHora: string;
  readonly ubicacion: string;
  readonly testigo?: string;
  readonly zonaInfluenciaId?: string;
  readonly observaciones?: string;
}

export interface RegistrarAvistamientoInput extends DatosAvistamientoInput {
  readonly usuarioId: string;
}

export interface AvistamientoConCriminal {
  readonly avistamiento: Avistamiento;
  readonly criminalNombre: string;
}

/**
 * RF-3 "registrar avistamientos de un criminal (fecha, ubicacion, testigo)".
 *
 * Un avistamiento registrado por un marino entra como OFICIAL y PENDIENTE de
 * verificacion: lo confirma o lo descarta el Director de Inteligencia.
 * Publica AVISTAMIENTO_REGISTRADO para que las demas bases lo reciban.
 */
@Injectable()
export class RegistrarAvistamientoUseCase implements UseCase<
  RegistrarAvistamientoInput,
  AvistamientoConCriminal
> {
  constructor(
    @Inject(AVISTAMIENTO_REPOSITORY) private readonly avistamientos: AvistamientoRepositoryPort,
    @Inject(CRIMINAL_READER) private readonly criminales: CriminalReaderPort,
    @Inject(ZONA_CATALOGO) private readonly zonas: ZonaCatalogoPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: RegistrarAvistamientoInput): Promise<AvistamientoConCriminal> {
    const criminal = await exigirCriminal(this.criminales, input.criminalId);
    await validarZona(this.zonas, input.zonaInfluenciaId);

    const avistamiento = new Avistamiento();
    avistamiento.id = randomUUID();
    avistamiento.criminalId = criminal.id;
    avistamiento.fechaHora = parsearFechaHora(input.fechaHora);
    avistamiento.ubicacion = input.ubicacion.trim();
    avistamiento.testigo = textoOpcional(input.testigo);
    avistamiento.zonaInfluenciaId = input.zonaInfluenciaId ?? null;
    avistamiento.observaciones = textoOpcional(input.observaciones);
    avistamiento.estadoVerificacion = EstadoVerificacion.PENDIENTE;
    avistamiento.origen = OrigenAvistamiento.OFICIAL;
    avistamiento.registradoPor = input.usuarioId;
    avistamiento.verificadoPor = null;

    const guardado = await this.avistamientos.guardar(avistamiento);

    const evento: AvistamientoRegistradoEvent = {
      avistamientoId: guardado.id,
      criminalId: guardado.criminalId,
      zonaInfluenciaId: guardado.zonaInfluenciaId,
      usuarioId: input.usuarioId,
    };
    this.eventos.emit(EVENTOS.AVISTAMIENTO_REGISTRADO, evento);

    return { avistamiento: guardado, criminalNombre: criminal.nombre };
  }
}
