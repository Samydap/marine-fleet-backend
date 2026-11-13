import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_PORT, type StoragePort } from '../../../shared/domain/storage/storage.port';
import { rutaDesdeUrl } from '../domain/instantanea-cartel';

export interface FotoCartel {
  readonly contenido: Buffer;
  readonly mime: 'image/png' | 'image/jpeg';
}

/**
 * Carga la foto del criminal para imprimirla. Solo PNG y JPEG (lo que PDFKit
 * sabe incrustar); cualquier otro caso devuelve null y el cartel muestra el
 * recuadro "SIN FOTOGRAFIA". Nunca lanza: un cartel sin foto es mejor que
 * ningun cartel.
 */
@Injectable()
export class FotoCartelLoader {
  constructor(@Inject(STORAGE_PORT) private readonly storage: StoragePort) {}

  async cargar(fotoUrl: string | null): Promise<FotoCartel | null> {
    if (!fotoUrl) return null;
    try {
      const ruta = rutaDesdeUrl(fotoUrl);
      if (!(await this.storage.existe(ruta))) return null;
      const contenido = await this.storage.leer(ruta);
      if (
        contenido
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      ) {
        return { contenido, mime: 'image/png' };
      }
      if (contenido[0] === 0xff && contenido[1] === 0xd8) {
        return { contenido, mime: 'image/jpeg' };
      }
      return null;
    } catch {
      return null;
    }
  }
}
