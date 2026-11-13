import type { Cartel, MotivoGeneracion } from '../../domain/cartel.entity';

export interface CartelResponse {
  id: string;
  criminalId: string;
  numeroVersion: number;
  vigente: boolean;
  motivoGeneracion: MotivoGeneracion;
  generadoPor: string | null;
  generadoEn: Date;
  /** URL directa del PDF guardado (publica, sirve para <a> o <iframe>). */
  archivoUrl: string;
  tamanoBytes: number;
  /** Rutas de descarga por formato a traves del API. */
  descargas: { pdf: string; imagen: string };
  datos: Record<string, unknown>;
}

export function aCartelResponse(cartel: Cartel): CartelResponse {
  const base = `/api/v1/carteles/${cartel.id}/descargar`;
  return {
    id: cartel.id,
    criminalId: cartel.criminalId,
    numeroVersion: cartel.numeroVersion,
    vigente: Boolean(cartel.vigente),
    motivoGeneracion: cartel.motivoGeneracion,
    generadoPor: cartel.generadoPor,
    generadoEn: cartel.generadoEn,
    archivoUrl: cartel.archivo.url,
    tamanoBytes: cartel.archivo.tamano_bytes,
    descargas: { pdf: `${base}?formato=pdf`, imagen: `${base}?formato=svg` },
    datos: cartel.datosInstantanea,
  };
}
