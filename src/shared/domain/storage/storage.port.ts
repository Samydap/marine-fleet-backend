export const STORAGE_PORT = Symbol('STORAGE_PORT');

export interface ArchivoGuardado {
  /** Ruta relativa dentro del almacenamiento, por ejemplo `carteles/c-luffy/v3.pdf`. */
  readonly ruta: string;
  /** URL publica relativa al API para descargarlo. */
  readonly url: string;
  readonly mime: string;
  readonly tamanoBytes: number;
}

/**
 * Puerto de almacenamiento de archivos (carteles, fotos, reportes exportados).
 *
 * Vive en shared/domain y no en infrastructure/ para que los casos de uso lo
 * puedan importar sin romper la regla de capas: application/ conoce puertos,
 * nunca adaptadores. El adaptador local esta en shared/infrastructure/storage.
 */
export interface StoragePort {
  guardar(ruta: string, contenido: Buffer, mime: string): Promise<ArchivoGuardado>;
  leer(ruta: string): Promise<Buffer>;
  existe(ruta: string): Promise<boolean>;
}
