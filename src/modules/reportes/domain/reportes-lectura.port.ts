import type {
  AgrupacionTendencia,
  Estadisticas,
  FilaRecompensasPorMar,
  FilaTendencia,
  InstantaneaReporte,
  TablaReporte,
} from './reportes.types';

export const REPORTES_LECTURA = Symbol('REPORTES_LECTURA');

/**
 * MODELO DE LECTURA (estilo CQRS). Calcula agregados leyendo varias tablas
 * (criminales, recompensas, mares, zonas, organizaciones, avistamientos) con UNA
 * consulta agregada por reporte, para cumplir el RNF de 3 segundos.
 *
 * Nunca escribe las tablas de otros modulos: lo unico que escribe es su propia
 * tabla `reportes_recompensas` (la instantanea del reporte mensual).
 */
export interface ReportesLecturaPort {
  recompensasPorMar(fechaCorte: Date): Promise<FilaRecompensasPorMar[]>;
  guardarInstantanea(
    periodo: string,
    filas: FilaRecompensasPorMar[],
    usuarioId: string | null,
  ): Promise<void>;
  listarInstantaneas(): Promise<InstantaneaReporte[]>;
  tendencias(agrupar: AgrupacionTendencia, desdeAvistamientos: Date): Promise<FilaTendencia[]>;
  /** avistamientosPorMes llega sin rellenar: solo los meses que tienen datos. */
  estadisticas(desdeAvistamientos: Date): Promise<Estadisticas>;
}

export const REPORTE_PDF = Symbol('REPORTE_PDF');

export interface ReportePdfPort {
  generar(tabla: TablaReporte): Promise<Buffer>;
}
