import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import type { ReportesLecturaPort } from '../domain/reportes-lectura.port';
import type {
  AgrupacionTendencia,
  Estadisticas,
  FilaRecompensasPorMar,
  FilaTendencia,
  InstantaneaReporte,
  PuntoGrafico,
  ResumenGeneral,
} from '../domain/reportes.types';
import {
  SQL_AVISTAMIENTOS_POR_MES,
  SQL_GUARDAR_INSTANTANEA,
  SQL_INSTANTANEAS,
  SQL_POR_CATEGORIA,
  SQL_POR_ESTADO,
  SQL_POR_MAR,
  SQL_POR_NIVEL,
  SQL_RECOMPENSAS_POR_MAR,
  SQL_RESUMEN,
  SQL_TENDENCIA_AFILIACION,
  SQL_TENDENCIA_NIVEL,
  SQL_TENDENCIA_ZONA,
} from './consultas-reportes.sql';

type Fila = Record<string, unknown>;

/** El driver devuelve COUNT/SUM como number, string o bigint segun el motor: se normaliza. */
const num = (valor: unknown): number => Number(valor ?? 0);
const txt = (valor: unknown): string => String(valor ?? '');

const SQL_TENDENCIA: Record<AgrupacionTendencia, string> = {
  zona: SQL_TENDENCIA_ZONA,
  nivel: SQL_TENDENCIA_NIVEL,
  afiliacion: SQL_TENDENCIA_AFILIACION,
};

/**
 * Adaptador del modelo de lectura. Usa el DataSource con SQL agregado en lugar
 * de repositorios de entidades: un reporte no necesita hidratar objetos, solo
 * totales, y asi responde en milisegundos.
 */
@Injectable()
export class TypeOrmReportesLecturaAdapter implements ReportesLecturaPort {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async recompensasPorMar(fechaCorte: Date): Promise<FilaRecompensasPorMar[]> {
    const filas = (await this.db.query(SQL_RECOMPENSAS_POR_MAR, [
      fechaCorte,
      fechaCorte,
    ])) as Fila[];
    return filas.map((f) => ({
      marId: txt(f.marId),
      marNombre: txt(f.marNombre),
      tipoMar: txt(f.tipoMar),
      totalAcumulado: num(f.totalAcumulado),
      cantidadCriminales: num(f.cantidadCriminales),
    }));
  }

  async guardarInstantanea(
    periodo: string,
    filas: FilaRecompensasPorMar[],
    usuarioId: string | null,
  ): Promise<void> {
    const ahora = new Date();
    await this.db.transaction(async (manager) => {
      for (const f of filas) {
        await manager.query(SQL_GUARDAR_INSTANTANEA, [
          randomUUID(),
          periodo,
          f.marId,
          f.marNombre,
          f.totalAcumulado,
          f.cantidadCriminales,
          usuarioId,
          ahora,
        ]);
      }
    });
  }

  async listarInstantaneas(): Promise<InstantaneaReporte[]> {
    const filas = (await this.db.query(SQL_INSTANTANEAS)) as Fila[];
    return filas.map((f) => ({
      periodo: txt(f.periodo),
      marId: txt(f.marId),
      marNombre: txt(f.marNombre),
      totalAcumulado: num(f.totalAcumulado),
      cantidadCriminales: num(f.cantidadCriminales),
      generadoPor: f.generadoPor ? txt(f.generadoPor) : null,
      generadoEn: new Date(f.generadoEn as string),
    }));
  }

  async tendencias(agrupar: AgrupacionTendencia, desde: Date): Promise<FilaTendencia[]> {
    const filas = (await this.db.query(SQL_TENDENCIA[agrupar], [desde])) as Fila[];
    return filas.map((f) => ({
      grupo: txt(f.grupo),
      subgrupo: f.subgrupo === null ? null : txt(f.subgrupo),
      totalCriminales: num(f.totalCriminales),
      activos: num(f.activos),
      capturados: num(f.capturados),
      muertos: num(f.muertos),
      recompensaActiva: num(f.recompensaActiva),
      avistamientosRecientes: num(f.avistamientosRecientes),
    }));
  }

  /** Las seis consultas son independientes: corren en paralelo. */
  async estadisticas(desde: Date): Promise<Estadisticas> {
    const [resumen, nivel, mar, categoria, estado, meses] = (await Promise.all([
      this.db.query(SQL_RESUMEN),
      this.db.query(SQL_POR_NIVEL),
      this.db.query(SQL_POR_MAR),
      this.db.query(SQL_POR_CATEGORIA),
      this.db.query(SQL_POR_ESTADO),
      this.db.query(SQL_AVISTAMIENTOS_POR_MES, [desde]),
    ])) as Fila[][];

    return {
      resumen: this.aResumen(resumen[0] ?? {}),
      porNivelAmenaza: this.aPuntos(nivel),
      porMar: this.aPuntos(mar),
      porCategoria: this.aPuntos(categoria),
      porEstado: this.aPuntos(estado),
      avistamientosPorMes: this.aPuntos(meses),
    };
  }

  private aPuntos(filas: Fila[]): PuntoGrafico[] {
    return filas.map((f) => ({ etiqueta: txt(f.etiqueta), valor: num(f.valor) }));
  }

  private aResumen(f: Fila): ResumenGeneral {
    return {
      criminalesActivos: num(f.criminalesActivos),
      criminalesCapturados: num(f.criminalesCapturados),
      criminalesMuertos: num(f.criminalesMuertos),
      recompensaActivaTotal: num(f.recompensaActivaTotal),
      reportesPendientes: num(f.reportesPendientes),
      avistamientosPendientes: num(f.avistamientosPendientes),
      recompensasPorValidar: num(f.recompensasPorValidar),
    };
  }
}
