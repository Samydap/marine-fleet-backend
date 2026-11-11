import type { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';

export const CARTEL_RENDERER = Symbol('CARTEL_RENDERER');

/** Datos congelados que se imprimen en el cartel. */
export interface DatosCartel {
  readonly criminalId: string;
  readonly nombre: string;
  readonly alias: string[];
  readonly recompensa: number | null;
  readonly moneda: string;
  readonly nivelAmenaza: NivelAmenaza;
  readonly organizacion: string | null;
  readonly fotoUrl: string | null;
  readonly textoLegal: string;
}

/**
 * RF-2. Puerto de renderizado. Existe para que el motor documental (hoy PDFKit)
 * sea sustituible por otro (Puppeteer, un servicio externo) sin tocar el caso de
 * uso, y para que el caso de uso se pueda probar con un renderer falso.
 */
export interface CartelRendererPort {
  renderizar(datos: DatosCartel): Promise<{ contenido: Buffer; mime: string }>;
}
