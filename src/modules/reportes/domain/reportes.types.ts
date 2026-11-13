/** RF Analisis y Reportes. Tipos de lectura: no son entidades, son vistas calculadas. */

/** Una fila del reporte mensual: total en recompensas activas de un mar. */
export interface FilaRecompensasPorMar {
  readonly marId: string;
  readonly marNombre: string;
  /** CUATRO_MARES | GRAND_LINE */
  readonly tipoMar: string;
  readonly totalAcumulado: number;
  readonly cantidadCriminales: number;
}

export interface ReporteRecompensasPorMar {
  readonly periodo: string;
  /** Instante al que corresponden los montos (fin de mes, o ahora si es el mes en curso). */
  readonly fechaCorte: Date;
  readonly filas: FilaRecompensasPorMar[];
  readonly totalGeneral: number;
  readonly generadoEn: Date;
}

/** Instantanea guardada en `reportes_recompensas` (clase ReporteRecompensas del diagrama). */
export interface InstantaneaReporte {
  readonly periodo: string;
  readonly marId: string;
  readonly marNombre: string;
  readonly totalAcumulado: number;
  readonly cantidadCriminales: number;
  readonly generadoPor: string | null;
  readonly generadoEn: Date;
}

export type AgrupacionTendencia = 'zona' | 'afiliacion' | 'nivel';

/** RF "reportes de tendencias criminales por zona, afiliacion y nivel de amenaza". */
export interface FilaTendencia {
  /** Zona, categoria de organizacion o nivel de amenaza, segun la agrupacion. */
  readonly grupo: string;
  /** Mar de la zona, o nombre de la organizacion. Null en la agrupacion por nivel. */
  readonly subgrupo: string | null;
  readonly totalCriminales: number;
  readonly activos: number;
  readonly capturados: number;
  readonly muertos: number;
  readonly recompensaActiva: number;
  /** Avistamientos de los ultimos 90 dias: la "tendencia" de actividad reciente. */
  readonly avistamientosRecientes: number;
}

/** Forma lista para graficar: [{ etiqueta, valor }]. */
export interface PuntoGrafico {
  readonly etiqueta: string;
  readonly valor: number;
}

export interface ResumenGeneral {
  readonly criminalesActivos: number;
  readonly criminalesCapturados: number;
  readonly criminalesMuertos: number;
  readonly recompensaActivaTotal: number;
  readonly reportesPendientes: number;
  readonly avistamientosPendientes: number;
  readonly recompensasPorValidar: number;
}

export interface Estadisticas {
  readonly resumen: ResumenGeneral;
  readonly porNivelAmenaza: PuntoGrafico[];
  readonly porMar: PuntoGrafico[];
  readonly porCategoria: PuntoGrafico[];
  readonly porEstado: PuntoGrafico[];
  readonly avistamientosPorMes: PuntoGrafico[];
}

/** Tabla generica para exportar cualquier reporte a CSV o PDF. */
export interface ColumnaReporte {
  readonly clave: string;
  readonly titulo: string;
  readonly tipo: 'texto' | 'numero' | 'moneda';
}

export interface TablaReporte {
  readonly titulo: string;
  readonly subtitulo: string;
  readonly nombreArchivo: string;
  readonly columnas: ColumnaReporte[];
  readonly filas: Array<Record<string, string | number | null>>;
  readonly totales?: Record<string, string | number>;
}
