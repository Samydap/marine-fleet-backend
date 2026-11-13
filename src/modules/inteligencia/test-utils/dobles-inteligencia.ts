import type { EventEmitter2 } from '@nestjs/event-emitter';
import { PageResult } from '../../../shared/application/pagination/page-result';
import { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';
import type {
  CriminalReaderPort,
  CriminalResumen,
} from '../../criminales/domain/criminal.repository.port';
import { EstadoCriminal } from '../../criminales/domain/estado-criminal.enum';
import type { Avistamiento } from '../domain/avistamiento.entity';
import type { AvistamientoRepositoryPort } from '../domain/avistamiento.repository.port';
import type { ReporteCiudadano } from '../domain/reporte-ciudadano.entity';
import type { ReporteCiudadanoRepositoryPort } from '../domain/reporte-ciudadano.repository.port';
import type { ZonaCatalogoPort } from '../domain/zona-catalogo.port';

const LUFFY: CriminalResumen = {
  id: 'c-luffy',
  nombre: 'Monkey D. Luffy',
  alias: [],
  estado: EstadoCriminal.ACTIVO,
  nivelAmenaza: NivelAmenaza.ALTO,
  recompensaVigenteMonto: 3_000_000_000,
  zonaInfluenciaId: 'z-wano',
  fotoUrl: null,
  organizacion: null,
};

/** Solo lo que usa inteligencia; `as` para no romperse si el puerto crece. */
export const criminalesFalsos = {
  obtenerResumen: (id: string): Promise<CriminalResumen | null> =>
    Promise.resolve(id === LUFFY.id ? LUFFY : null),
  existe: (id: string): Promise<boolean> => Promise.resolve(id === LUFFY.id),
} as unknown as CriminalReaderPort;

export const zonasFalsas: ZonaCatalogoPort = {
  existeZona: (id) => Promise.resolve(['z-wano', 'z-loguetown'].includes(id)),
};

export class AvistamientosEnMemoria implements AvistamientoRepositoryPort {
  datos: Avistamiento[] = [];
  buscarPorId(id: string): Promise<Avistamiento | null> {
    return Promise.resolve(this.datos.find((a) => a.id === id) ?? null);
  }
  listar(): Promise<PageResult<Avistamiento>> {
    return Promise.resolve(new PageResult(this.datos, this.datos.length, 1, 20));
  }
  guardar(a: Avistamiento): Promise<Avistamiento> {
    this.datos = [...this.datos.filter((x) => x.id !== a.id), a];
    return Promise.resolve(a);
  }
  eliminar(id: string): Promise<void> {
    this.datos = this.datos.filter((a) => a.id !== id);
    return Promise.resolve();
  }
}

export class ReportesEnMemoria implements ReporteCiudadanoRepositoryPort {
  datos: ReporteCiudadano[] = [];
  avistamientosCreados: Avistamiento[] = [];
  buscarPorId(id: string): Promise<ReporteCiudadano | null> {
    return Promise.resolve(this.datos.find((r) => r.id === id) ?? null);
  }
  listar(): Promise<PageResult<ReporteCiudadano>> {
    return Promise.resolve(new PageResult(this.datos, this.datos.length, 1, 20));
  }
  guardar(r: ReporteCiudadano): Promise<ReporteCiudadano> {
    this.datos = [...this.datos.filter((x) => x.id !== r.id), r];
    return Promise.resolve(r);
  }
  async aprobarConAvistamiento(r: ReporteCiudadano, a: Avistamiento): Promise<void> {
    this.avistamientosCreados.push(a);
    await this.guardar(r);
  }
}

export function emisorFalso(): EventEmitter2 & { emitidos: string[] } {
  const emitidos: string[] = [];
  return {
    emitidos,
    emit: (nombre: string) => {
      emitidos.push(nombre);
      return true;
    },
  } as unknown as EventEmitter2 & { emitidos: string[] };
}
