import type { DatosCartel } from '../../domain/cartel-renderer.port';
import { formatearBerries } from '../../domain/instantanea-cartel';

/**
 * Plantilla comun del cartel WANTED. La usan los dos renderers (PDF y SVG) para
 * que ambos formatos tengan exactamente el mismo diseño y los mismos textos.
 * Medidas en puntos de un A4 vertical (595 x 842).
 */
export const LIENZO = { ancho: 595, alto: 842, margen: 28 } as const;

export const COLORES = {
  papel: '#F1DDB4',
  borde: '#5B3A1E',
  tinta: '#3B2412',
  sello: '#B3261E',
} as const;

export const FOTO = { x: 97, y: 205, ancho: 401, alto: 300 } as const;

const COLOR_NIVEL: Record<string, string> = {
  BAJO: '#2E7D32',
  MEDIO: '#E08E0B',
  ALTO: '#B3261E',
  PENDIENTE: '#6D6D6D',
};

export interface TextosCartel {
  readonly titulo: string;
  readonly subtitulo: string;
  readonly condicion: string;
  readonly nombre: string;
  readonly alias: string;
  readonly recompensa: string;
  readonly nivel: string;
  readonly colorNivel: string;
  readonly organizacion: string;
  readonly sello: string | null;
  readonly legal: string;
}

const SELLOS: Record<string, string> = { CAPTURADO: 'CAPTURADO', MUERTO: 'FALLECIDO' };

const CATEGORIAS: Record<string, string> = {
  PIRATA: 'Pirata',
  REVOLUCIONARIO: 'Ejercito Revolucionario',
  CRIMINAL_INDEPENDIENTE: 'Criminal independiente',
};

/** Textos listos para imprimir. Toda la logica de presentacion vive aqui. */
export function textosCartel(datos: DatosCartel): TextosCartel {
  const categoria = datos.categoriaOrganizacion ? CATEGORIAS[datos.categoriaOrganizacion] : null;
  const organizacion = datos.organizacion
    ? `${datos.organizacion}${categoria ? ` (${categoria})` : ''}`
    : 'Sin afiliacion conocida';

  return {
    titulo: 'WANTED',
    subtitulo: 'SE BUSCA',
    condicion: 'DEAD OR ALIVE  -  VIVO O MUERTO',
    nombre: datos.nombre.toUpperCase(),
    alias: datos.alias.length ? `Alias: ${datos.alias.join(', ')}` : '',
    recompensa:
      datos.recompensa === null ? 'RECOMPENSA POR DEFINIR' : formatearBerries(datos.recompensa),
    nivel: `NIVEL DE AMENAZA: ${datos.nivelAmenaza}`,
    colorNivel: COLOR_NIVEL[datos.nivelAmenaza] ?? COLOR_NIVEL.PENDIENTE,
    organizacion,
    sello: SELLOS[datos.estado] ?? null,
    legal: datos.textoLegal,
  };
}
