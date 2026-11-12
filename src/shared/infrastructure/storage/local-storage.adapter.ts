import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, normalize, resolve, sep } from 'node:path';
import { DomainError } from '../../domain/errors/domain.error';
import type { ArchivoGuardado, StoragePort } from '../../domain/storage/storage.port';

/**
 * Almacenamiento en disco local. Suficiente para el semestre; en produccion se
 * sustituye por S3 o similar cambiando solo este archivo.
 *
 * Seguridad: toda ruta se resuelve dentro de la carpeta raiz. Una ruta como
 * `../../etc/passwd` se rechaza (path traversal).
 */
@Injectable()
export class LocalStorageAdapter implements StoragePort {
  private readonly raiz: string;

  constructor(config: ConfigService) {
    const configurada = config.get<string>('app.storagePath') ?? './storage/carteles';
    // STORAGE_PATH apunta historicamente a ./storage/carteles: la raiz es su padre.
    this.raiz = resolve(configurada.replace(/[\\/]carteles[\\/]?$/, ''));
  }

  async guardar(ruta: string, contenido: Buffer, mime: string): Promise<ArchivoGuardado> {
    const absoluta = this.resolverSegura(ruta);
    await mkdir(dirname(absoluta), { recursive: true });
    await writeFile(absoluta, contenido);
    return {
      ruta: this.relativa(ruta),
      url: `/api/v1/archivos/${this.relativa(ruta)}`,
      mime,
      tamanoBytes: contenido.length,
    };
  }

  async leer(ruta: string): Promise<Buffer> {
    return readFile(this.resolverSegura(ruta));
  }

  async existe(ruta: string): Promise<boolean> {
    try {
      await stat(this.resolverSegura(ruta));
      return true;
    } catch {
      return false;
    }
  }

  private relativa(ruta: string): string {
    return normalize(ruta).replace(/\\/g, '/').replace(/^\/+/, '');
  }

  private resolverSegura(ruta: string): string {
    const absoluta = resolve(this.raiz, this.relativa(ruta));
    if (absoluta !== this.raiz && !absoluta.startsWith(this.raiz + sep)) {
      throw new DomainError('Ruta de archivo no valida.', 'RUTA_INVALIDA');
    }
    return absoluta;
  }
}
