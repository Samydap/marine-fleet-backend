import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { fechaDeCorte, periodoDe } from '../domain/periodo';
import { REPORTES_LECTURA, type ReportesLecturaPort } from '../domain/reportes-lectura.port';
import type { InstantaneaReporte, ReporteRecompensasPorMar } from '../domain/reportes.types';

export interface ReporteRecompensasInput {
  /** `YYYY-MM`. Si no se envia, el mes en curso. */
  readonly periodo?: string;
  readonly usuarioId: string | null;
}

/**
 * RF "generar un reporte mensual que resuma el total acumulado en recompensas
 * activas por cada uno de los Cuatro Mares y la Grand Line".
 *
 * Suma, por mar, las recompensas que estaban vigentes en la fecha de corte del
 * mes (fin de mes, o ahora si es el mes en curso) de los criminales ACTIVOS. Se
 * reconstruye desde la tabla historica `recompensas` (vigente_desde/hasta), asi
 * que el reporte de un mes pasado da lo que valia ESE mes.
 *
 * Solo el mes EN CURSO actualiza su instantanea en `reportes_recompensas`.
 * Consultar un mes cerrado no reescribe nada (un GET no debe cambiar la
 * historia): la instantanea guardada de ese mes queda como el registro oficial,
 * congelada en la ultima vez que se genero durante el mes.
 */
@Injectable()
export class ReporteRecompensasPorMarUseCase implements UseCase<
  ReporteRecompensasInput,
  ReporteRecompensasPorMar
> {
  constructor(@Inject(REPORTES_LECTURA) private readonly lectura: ReportesLecturaPort) {}

  async execute(input: ReporteRecompensasInput): Promise<ReporteRecompensasPorMar> {
    const ahora = new Date();
    const periodo = input.periodo ?? periodoDe(ahora);
    const corte = fechaDeCorte(periodo, ahora);

    const filas = await this.lectura.recompensasPorMar(corte);
    if (periodo === periodoDe(ahora)) {
      await this.lectura.guardarInstantanea(periodo, filas, input.usuarioId);
    }

    return {
      periodo,
      fechaCorte: corte,
      filas,
      totalGeneral: filas.reduce((suma, fila) => suma + fila.totalAcumulado, 0),
      generadoEn: ahora,
    };
  }
}

/** Historial de reportes mensuales ya generados (instantaneas guardadas). */
@Injectable()
export class HistorialReportesUseCase {
  constructor(@Inject(REPORTES_LECTURA) private readonly lectura: ReportesLecturaPort) {}

  execute(): Promise<InstantaneaReporte[]> {
    return this.lectura.listarInstantaneas();
  }
}
