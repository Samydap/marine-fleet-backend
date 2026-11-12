import type {
  Estadisticas,
  FilaTendencia,
  PuntoGrafico,
  ReporteRecompensasPorMar,
  TablaReporte,
} from '../domain/reportes.types';
import type { Tendencias } from './tendencias.use-case';

/**
 * Convierte cada reporte en una TablaReporte generica: asi el mismo exportador
 * sirve para CSV y PDF de cualquier reporte, y agregar un reporte nuevo no
 * obliga a tocar los exportadores.
 */
export function tablaRecompensasPorMar(reporte: ReporteRecompensasPorMar): TablaReporte {
  return {
    titulo: `Recompensas activas por mar - ${reporte.periodo}`,
    subtitulo: `Corte: ${reporte.fechaCorte.toISOString()} | Generado: ${reporte.generadoEn.toISOString()}`,
    nombreArchivo: `recompensas-por-mar-${reporte.periodo}`,
    columnas: [
      { clave: 'mar', titulo: 'Mar', tipo: 'texto' },
      { clave: 'tipo', titulo: 'Tipo', tipo: 'texto' },
      { clave: 'criminales', titulo: 'Criminales activos', tipo: 'numero' },
      { clave: 'total', titulo: 'Total acumulado (berries)', tipo: 'moneda' },
    ],
    filas: reporte.filas.map((f) => ({
      mar: f.marNombre,
      tipo: f.tipoMar === 'GRAND_LINE' ? 'Grand Line' : 'Cuatro Mares',
      criminales: f.cantidadCriminales,
      total: f.totalAcumulado,
    })),
    totales: {
      mar: 'TOTAL',
      criminales: reporte.filas.reduce((s, f) => s + f.cantidadCriminales, 0),
      total: reporte.totalGeneral,
    },
  };
}

const TITULO_GRUPO: Record<Tendencias['agrupacion'], [string, string]> = {
  zona: ['Zona de influencia', 'Mar'],
  afiliacion: ['Categoria', 'Organizacion'],
  nivel: ['Nivel de amenaza', ''],
};

export function tablaTendencias(tendencias: Tendencias): TablaReporte {
  const [grupo, subgrupo] = TITULO_GRUPO[tendencias.agrupacion];
  return {
    titulo: `Tendencias criminales por ${tendencias.agrupacion}`,
    subtitulo: `Actividad reciente: avistamientos de los ultimos ${tendencias.ventanaDias} dias`,
    nombreArchivo: `tendencias-${tendencias.agrupacion}`,
    columnas: [
      { clave: 'grupo', titulo: grupo, tipo: 'texto' },
      ...(subgrupo ? [{ clave: 'subgrupo', titulo: subgrupo, tipo: 'texto' as const }] : []),
      { clave: 'totalCriminales', titulo: 'Total', tipo: 'numero' },
      { clave: 'activos', titulo: 'Activos', tipo: 'numero' },
      { clave: 'capturados', titulo: 'Capturados', tipo: 'numero' },
      { clave: 'muertos', titulo: 'Muertos', tipo: 'numero' },
      { clave: 'recompensaActiva', titulo: 'Recompensa activa', tipo: 'moneda' },
      { clave: 'avistamientosRecientes', titulo: 'Avistamientos', tipo: 'numero' },
    ],
    filas: tendencias.filas.map((f: FilaTendencia) => ({ ...f })),
  };
}

export function tablaEstadisticas(e: Estadisticas): TablaReporte {
  const series: Array<[string, PuntoGrafico[]]> = [
    ['Nivel de amenaza (activos)', e.porNivelAmenaza],
    ['Criminales activos por mar', e.porMar],
    ['Categoria (activos)', e.porCategoria],
    ['Estado', e.porEstado],
    ['Avistamientos por mes', e.avistamientosPorMes],
  ];
  return {
    titulo: 'Estadisticas generales',
    subtitulo: `Recompensa activa total: ${Math.round(e.resumen.recompensaActivaTotal).toLocaleString('es-CO')} B`,
    nombreArchivo: 'estadisticas',
    columnas: [
      { clave: 'serie', titulo: 'Serie', tipo: 'texto' },
      { clave: 'etiqueta', titulo: 'Categoria', tipo: 'texto' },
      { clave: 'valor', titulo: 'Valor', tipo: 'numero' },
    ],
    filas: series.flatMap(([serie, puntos]) =>
      puntos.map((p) => ({ serie, etiqueta: p.etiqueta, valor: p.valor })),
    ),
  };
}
