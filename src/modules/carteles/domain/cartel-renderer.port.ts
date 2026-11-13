import type { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';

export const CARTEL_RENDERER = Symbol('CARTEL_RENDERER');

/** Formatos de salida del cartel: PDF para imprimir, SVG como "imagen". */
export type FormatoCartel = 'pdf' | 'svg';

/**
 * Datos congelados que se imprimen en el cartel. Es tambien la forma de
 * `carteles.datos_instantanea`: lo que se imprimio una vez no cambia aunque el
 * criminal cambie despues.
 */
export interface DatosCartel {
  readonly criminalId: string;
  readonly nombre: string;
  readonly alias: string[];
  readonly recompensa: number | null;
  readonly moneda: string;
  readonly nivelAmenaza: NivelAmenaza;
  /** ACTIVO | CAPTURADO | MUERTO: si no esta ACTIVO el cartel lleva sello. */
  readonly estado: string;
  readonly organizacion: string | null;
  readonly categoriaOrganizacion: string | null;
  readonly fotoUrl: string | null;
  readonly textoLegal: string;
}

export interface CartelRenderizado {
  readonly contenido: Buffer;
  readonly mime: string;
}

/**
 * RF-2. Puerto de renderizado. Existe para que el motor documental (hoy PDFKit
 * y SVG a mano) sea sustituible sin tocar el caso de uso, y para que el caso de
 * uso se pueda probar con un renderer falso.
 */
export interface CartelRendererPort {
  renderizar(datos: DatosCartel, formato: FormatoCartel): Promise<CartelRenderizado>;
}
