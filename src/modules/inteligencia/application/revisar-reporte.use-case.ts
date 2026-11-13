import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type {
  AvistamientoRegistradoEvent,
  ReporteAprobadoEvent,
} from '../../../shared/domain/events/eventos.contracts';
import {
  Avistamiento,
  EstadoVerificacion,
  OrigenAvistamiento,
} from '../domain/avistamiento.entity';
import { EstadoReporte, type ReporteCiudadano } from '../domain/reporte-ciudadano.entity';
import {
  REPORTE_CIUDADANO_REPOSITORY,
  type ReporteCiudadanoRepositoryPort,
} from '../domain/reporte-ciudadano.repository.port';

export interface RevisarReporteInput {
  readonly reporteId: string;
  readonly decision: EstadoReporte.APROBADO | EstadoReporte.RECHAZADO;
  readonly motivoRechazo?: string;
  readonly usuarioId: string;
}

export interface ResultadoRevision {
  readonly reporte: ReporteCiudadano;
  readonly avistamientoId: string | null;
}

/**
 * RF-3 "validar o verificar los reportes ciudadanos antes de convertirlos en
 * avistamientos oficiales".
 *
 *  - APROBADO: crea el avistamiento oficial (origen REPORTE_CIUDADANO, ya
 *    VERIFICADO) y lo enlaza al reporte, todo en una transaccion. Publica
 *    REPORTE_APROBADO y AVISTAMIENTO_REGISTRADO.
 *  - RECHAZADO: exige motivo. No crea nada.
 *  - Un reporte se revisa una sola vez (regla en la entidad).
 */
@Injectable()
export class RevisarReporteUseCase implements UseCase<RevisarReporteInput, ResultadoRevision> {
  constructor(
    @Inject(REPORTE_CIUDADANO_REPOSITORY) private readonly reportes: ReporteCiudadanoRepositoryPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: RevisarReporteInput): Promise<ResultadoRevision> {
    const reporte = await this.reportes.buscarPorId(input.reporteId);
    if (!reporte) {
      throw new NotFoundError('reporte ciudadano', input.reporteId);
    }

    if (input.decision === EstadoReporte.RECHAZADO) {
      reporte.rechazar(input.usuarioId, input.motivoRechazo);
      return { reporte: await this.reportes.guardar(reporte), avistamientoId: null };
    }

    const avistamiento = this.avistamientoDesde(reporte, input.usuarioId);
    reporte.aprobar(input.usuarioId, avistamiento.id);
    await this.reportes.aprobarConAvistamiento(reporte, avistamiento);

    const aprobado: ReporteAprobadoEvent = {
      reporteId: reporte.id,
      avistamientoId: avistamiento.id,
      criminalId: reporte.criminalId,
      usuarioId: input.usuarioId,
    };
    const registrado: AvistamientoRegistradoEvent = {
      avistamientoId: avistamiento.id,
      criminalId: avistamiento.criminalId,
      zonaInfluenciaId: avistamiento.zonaInfluenciaId,
      usuarioId: input.usuarioId,
    };
    this.eventos.emit(EVENTOS.REPORTE_APROBADO, aprobado);
    this.eventos.emit(EVENTOS.AVISTAMIENTO_REGISTRADO, registrado);

    return { reporte, avistamientoId: avistamiento.id };
  }

  private avistamientoDesde(reporte: ReporteCiudadano, usuarioId: string): Avistamiento {
    const avistamiento = new Avistamiento();
    avistamiento.id = randomUUID();
    avistamiento.criminalId = reporte.criminalId;
    avistamiento.fechaHora = reporte.fechaHecho ?? reporte.createdAt ?? new Date();
    avistamiento.ubicacion = reporte.ubicacion;
    avistamiento.testigo = reporte.testigo();
    avistamiento.zonaInfluenciaId = reporte.zonaInfluenciaId;
    avistamiento.observaciones = reporte.descripcion;
    avistamiento.estadoVerificacion = EstadoVerificacion.VERIFICADO;
    avistamiento.origen = OrigenAvistamiento.REPORTE_CIUDADANO;
    avistamiento.registradoPor = usuarioId;
    avistamiento.verificadoPor = usuarioId;
    return avistamiento;
  }
}
