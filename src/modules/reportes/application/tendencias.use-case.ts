import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { REPORTES_LECTURA, type ReportesLecturaPort } from '../domain/reportes-lectura.port';
import type { AgrupacionTendencia, FilaTendencia } from '../domain/reportes.types';

export const DIAS_TENDENCIA = 90;

export interface Tendencias {
  readonly agrupacion: AgrupacionTendencia;
  readonly ventanaDias: number;
  readonly filas: FilaTendencia[];
}

/**
 * RF "generar reportes de tendencias criminales por zona, afiliacion y nivel de
 * amenaza". Cada fila cuenta criminales por estado, suma la recompensa activa y
 * mide la actividad reciente (avistamientos de los ultimos 90 dias).
 */
@Injectable()
export class TendenciasUseCase implements UseCase<AgrupacionTendencia, Tendencias> {
  constructor(@Inject(REPORTES_LECTURA) private readonly lectura: ReportesLecturaPort) {}

  async execute(agrupacion: AgrupacionTendencia): Promise<Tendencias> {
    const desde = new Date(Date.now() - DIAS_TENDENCIA * 24 * 60 * 60 * 1000);
    const filas = await this.lectura.tendencias(agrupacion, desde);
    return { agrupacion, ventanaDias: DIAS_TENDENCIA, filas };
  }
}
