import { PageResult } from '../../../shared/application/pagination/page-result';
import { Criminal } from '../domain/criminal.entity';
import type { CriminalRepositoryPort } from '../domain/criminal.repository.port';
import { EstadoCriminal, NivelAmenaza } from '../domain/estado-criminal.enum';
import type { Membresia } from '../domain/membresia.entity';
import type { MembresiaRepositoryPort } from '../domain/membresia.repository.port';
import type { Organizacion } from '../domain/organizacion.entity';
import type { OrganizacionRepositoryPort } from '../domain/organizacion.repository.port';

/**
 * Dobles en memoria de los puertos del modulo, para las pruebas unitarias de
 * los casos de uso. No usan base de datos ni NestJS: por eso las pruebas corren
 * en milisegundos y no dependen del adaptador de TypeORM.
 */
export class CriminalesEnMemoria implements CriminalRepositoryPort {
  readonly datos = new Map<string, Criminal>();
  guardados = 0;

  buscarPorId(id: string): Promise<Criminal | null> {
    return Promise.resolve(this.datos.get(id) ?? null);
  }
  buscarPorNombreNormalizado(nombre: string): Promise<Criminal | null> {
    return Promise.resolve(
      [...this.datos.values()].find((c) => c.nombreNormalizado === nombre) ?? null,
    );
  }
  listar(): Promise<PageResult<Criminal>> {
    return Promise.resolve(new PageResult([...this.datos.values()], this.datos.size, 1, 20));
  }
  guardar(criminal: Criminal): Promise<Criminal> {
    this.guardados += 1;
    criminal.version = Number(criminal.version ?? 0) + 1;
    this.datos.set(criminal.id, criminal);
    return Promise.resolve(criminal);
  }
  existe(id: string): Promise<boolean> {
    return Promise.resolve(this.datos.has(id));
  }
}

export class MembresiasEnMemoria implements MembresiaRepositoryPort {
  readonly datos: Membresia[] = [];

  buscarVigente(criminalId: string, organizacionId: string): Promise<Membresia | null> {
    return Promise.resolve(
      this.datos.find(
        (m) => m.criminalId === criminalId && m.organizacionId === organizacionId && m.vigente,
      ) ?? null,
    );
  }
  listarPorCriminal(criminalId: string, soloVigentes: boolean): Promise<Membresia[]> {
    return Promise.resolve(
      this.datos.filter((m) => m.criminalId === criminalId && (!soloVigentes || m.vigente)),
    );
  }
  listarPorOrganizacion(organizacionId: string, soloVigentes: boolean): Promise<Membresia[]> {
    return Promise.resolve(
      this.datos.filter((m) => m.organizacionId === organizacionId && (!soloVigentes || m.vigente)),
    );
  }
  guardar(membresia: Membresia): Promise<Membresia> {
    if (!this.datos.includes(membresia)) this.datos.push(membresia);
    return Promise.resolve(membresia);
  }
}

export class OrganizacionesEnMemoria implements OrganizacionRepositoryPort {
  readonly datos = new Map<string, Organizacion>();

  buscarPorId(id: string): Promise<Organizacion | null> {
    return Promise.resolve(this.datos.get(id) ?? null);
  }
  buscarPorNombre(nombre: string): Promise<Organizacion | null> {
    return Promise.resolve([...this.datos.values()].find((o) => o.nombre === nombre) ?? null);
  }
  listar(): Promise<PageResult<Organizacion>> {
    return Promise.resolve(new PageResult([...this.datos.values()], this.datos.size, 1, 20));
  }
  guardar(organizacion: Organizacion): Promise<Organizacion> {
    this.datos.set(organizacion.id, organizacion);
    return Promise.resolve(organizacion);
  }
}

export function crearCriminal(cambios: Partial<Criminal> = {}): Criminal {
  return Object.assign(new Criminal(), {
    id: 'c-luffy',
    nombre: 'Monkey D. Luffy',
    nombreNormalizado: 'monkey d luffy',
    alias: ['Sombrero de Paja'],
    edad: 19,
    descripcionFisica: null,
    foto: null,
    estado: EstadoCriminal.ACTIVO,
    fechaBaja: null,
    zonaInfluenciaId: 'z-wano',
    recompensaVigenteMonto: 3_000_000_000,
    nivelAmenaza: NivelAmenaza.ALTO,
    origenBaseId: null,
    creadoPor: 'u-analista',
    actualizadoPor: 'u-analista',
    version: 1,
    membresias: [],
    ...cambios,
  });
}
