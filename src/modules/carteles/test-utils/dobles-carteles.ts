import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { ArchivoGuardado, StoragePort } from '../../../shared/domain/storage/storage.port';
import { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';
import type {
  CriminalReaderPort,
  CriminalResumen,
} from '../../criminales/domain/criminal.repository.port';
import { EstadoCriminal } from '../../criminales/domain/estado-criminal.enum';
import type {
  CartelRendererPort,
  DatosCartel,
  FormatoCartel,
} from '../domain/cartel-renderer.port';
import type { Cartel } from '../domain/cartel.entity';
import type { CartelRepositoryPort } from '../domain/cartel.repository.port';

/** Dobles en memoria compartidos por las pruebas del modulo (sin base ni disco). */
export function resumen(cambios: Partial<CriminalResumen> = {}): CriminalResumen {
  return {
    id: 'c-luffy',
    nombre: 'Monkey D. Luffy',
    alias: ['Sombrero de Paja'],
    estado: EstadoCriminal.ACTIVO,
    nivelAmenaza: NivelAmenaza.ALTO,
    recompensaVigenteMonto: 3_000_000_000,
    zonaInfluenciaId: 'z-wano',
    fotoUrl: null,
    organizacion: {
      id: 'org-sp',
      nombre: 'Piratas del Sombrero de Paja',
      categoria: 'PIRATA',
      rol: 'LIDER',
    },
    ...cambios,
  };
}

/**
 * Implementa solo lo que usan los carteles. `puerto` lo entrega con el tipo del
 * puerto completo: asi, si Criminales agrega metodos al puerto, estas pruebas no
 * se rompen por metodos que no usan.
 */
export class CriminalesEnMemoria implements Pick<
  CriminalReaderPort,
  'obtenerResumen' | 'existe' | 'obtenerResumenes' | 'listarTodosLosIds'
> {
  constructor(public datos: CriminalResumen[] = [resumen()]) {}

  get puerto(): CriminalReaderPort {
    return this as unknown as CriminalReaderPort;
  }

  obtenerResumen(id: string): Promise<CriminalResumen | null> {
    return Promise.resolve(this.datos.find((c) => c.id === id) ?? null);
  }
  existe(id: string): Promise<boolean> {
    return Promise.resolve(this.datos.some((c) => c.id === id));
  }
  obtenerResumenes(ids: readonly string[]): Promise<CriminalResumen[]> {
    return Promise.resolve(this.datos.filter((c) => ids.includes(c.id)));
  }
  listarTodosLosIds(): Promise<string[]> {
    return Promise.resolve(this.datos.map((c) => c.id));
  }
}

export class CartelesEnMemoria implements CartelRepositoryPort {
  carteles: Cartel[] = [];
  buscarPorId(id: string): Promise<Cartel | null> {
    return Promise.resolve(this.carteles.find((c) => c.id === id) ?? null);
  }
  buscarVigente(criminalId: string): Promise<Cartel | null> {
    return Promise.resolve(
      this.carteles.find((c) => c.criminalId === criminalId && c.vigente) ?? null,
    );
  }
  listarVersiones(criminalId: string): Promise<Cartel[]> {
    return Promise.resolve(
      this.carteles
        .filter((c) => c.criminalId === criminalId)
        .sort((a, b) => b.numeroVersion - a.numeroVersion),
    );
  }
  async guardarNuevaVersion(cartel: Cartel): Promise<Cartel> {
    // Simula la latencia de la base para que las pruebas de concurrencia sean reales.
    await new Promise((r) => setTimeout(r, 5));
    if (
      this.carteles.some(
        (c) => c.criminalId === cartel.criminalId && c.numeroVersion === cartel.numeroVersion,
      )
    ) {
      throw new Error('ER_DUP_ENTRY');
    }
    this.carteles.forEach((c) => {
      if (c.criminalId === cartel.criminalId) c.vigente = false;
    });
    cartel.generadoEn = new Date();
    this.carteles.push(cartel);
    return cartel;
  }
  listarCriminalesConCartel(): Promise<string[]> {
    return Promise.resolve([...new Set(this.carteles.map((c) => c.criminalId))]);
  }
}

export class RendererFalso implements CartelRendererPort {
  llamadas: Array<{ datos: DatosCartel; formato: FormatoCartel }> = [];
  renderizar(
    datos: DatosCartel,
    formato: FormatoCartel,
  ): Promise<{ contenido: Buffer; mime: string }> {
    this.llamadas.push({ datos, formato });
    const mime = formato === 'pdf' ? 'application/pdf' : 'image/svg+xml';
    return Promise.resolve({ contenido: Buffer.from(`${formato}:${datos.nombre}`), mime });
  }
}

export class StorageEnMemoria implements StoragePort {
  archivos = new Map<string, Buffer>();
  guardar(ruta: string, contenido: Buffer, mime: string): Promise<ArchivoGuardado> {
    this.archivos.set(ruta, contenido);
    return Promise.resolve({
      ruta,
      url: `/api/v1/archivos/${ruta}`,
      mime,
      tamanoBytes: contenido.length,
    });
  }
  leer(ruta: string): Promise<Buffer> {
    const archivo = this.archivos.get(ruta);
    return archivo ? Promise.resolve(archivo) : Promise.reject(new Error('no existe'));
  }
  existe(ruta: string): Promise<boolean> {
    return Promise.resolve(this.archivos.has(ruta));
  }
}

export function emisorFalso(): EventEmitter2 & { emitidos: Array<[string, unknown]> } {
  const emitidos: Array<[string, unknown]> = [];
  return {
    emitidos,
    emit: (nombre: string, datos: unknown) => {
      emitidos.push([nombre, datos]);
      return true;
    },
  } as unknown as EventEmitter2 & { emitidos: Array<[string, unknown]> };
}
