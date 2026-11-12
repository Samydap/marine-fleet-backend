import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { ReporteRecibidoEvent } from '../../../shared/domain/events/eventos.contracts';
import {
  CRIMINAL_READER,
  type CriminalReaderPort,
} from '../../criminales/domain/criminal.repository.port';
import { parsearFechaHora } from '../domain/fecha-hora';
import { EstadoReporte, ReporteCiudadano } from '../domain/reporte-ciudadano.entity';
import {
  REPORTE_CIUDADANO_REPOSITORY,
  type ReporteCiudadanoRepositoryPort,
} from '../domain/reporte-ciudadano.repository.port';
import { ZONA_CATALOGO, type ZonaCatalogoPort } from '../domain/zona-catalogo.port';
import { exigirCriminal, textoOpcional, validarZona } from './validaciones';

export interface RegistrarReporteInput {
  readonly criminalId: string;
  readonly descripcion: string;
  readonly ubicacion: string;
  readonly fechaHecho?: string;
  readonly zonaInfluenciaId?: string;
  readonly nombre?: string;
  readonly contacto?: string;
  readonly anonimo: boolean;
}

/** Lo unico que ve el ciudadano: no se le devuelve informacion interna. */
export interface ReporteRecibido {
  readonly id: string;
  readonly estado: EstadoReporte;
  readonly mensaje: string;
}

/**
 * RF-3 "permitir a ciudadanos o informantes reportar informacion sobre criminales".
 *
 * Entra siempre PENDIENTE: es informacion no confiable hasta que inteligencia la
 * revise. Si el informante pide anonimato, su nombre y contacto NO se guardan.
 */
@Injectable()
export class RegistrarReporteCiudadanoUseCase implements UseCase<
  RegistrarReporteInput,
  ReporteRecibido
> {
  constructor(
    @Inject(REPORTE_CIUDADANO_REPOSITORY) private readonly reportes: ReporteCiudadanoRepositoryPort,
    @Inject(CRIMINAL_READER) private readonly criminales: CriminalReaderPort,
    @Inject(ZONA_CATALOGO) private readonly zonas: ZonaCatalogoPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: RegistrarReporteInput): Promise<ReporteRecibido> {
    await exigirCriminal(this.criminales, input.criminalId);
    await validarZona(this.zonas, input.zonaInfluenciaId);

    const reporte = new ReporteCiudadano();
    reporte.id = randomUUID();
    reporte.criminalId = input.criminalId;
    reporte.descripcion = input.descripcion.trim();
    reporte.ubicacion = input.ubicacion.trim();
    reporte.fechaHecho = input.fechaHecho ? parsearFechaHora(input.fechaHecho) : null;
    reporte.zonaInfluenciaId = input.zonaInfluenciaId ?? null;
    reporte.informante = input.anonimo
      ? { anonimo: true }
      : {
          anonimo: false,
          nombre: textoOpcional(input.nombre) ?? undefined,
          contacto: textoOpcional(input.contacto) ?? undefined,
        };
    reporte.estado = EstadoReporte.PENDIENTE;
    reporte.revisadoPor = null;
    reporte.fechaRevision = null;
    reporte.motivoRechazo = null;
    reporte.avistamientoId = null;

    const guardado = await this.reportes.guardar(reporte);

    const evento: ReporteRecibidoEvent = {
      reporteId: guardado.id,
      criminalId: guardado.criminalId,
    };
    this.eventos.emit(EVENTOS.REPORTE_RECIBIDO, evento);

    return {
      id: guardado.id,
      estado: guardado.estado,
      mensaje: 'Gracias. Tu reporte fue recibido y sera revisado por el Centro de Inteligencia.',
    };
  }
}
