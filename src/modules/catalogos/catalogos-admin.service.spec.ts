import type { Repository } from 'typeorm';
import { ConcurrencyError } from '../../shared/domain/errors/concurrency.error';
import { DomainError } from '../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../shared/domain/errors/not-found.error';
import { CatalogosAdminService } from './catalogos-admin.service';
import { BaseNaval } from './entities/base-naval.entity';
import { Mar, TipoMar } from './entities/mar.entity';
import { ZonaInfluencia } from './entities/zona-influencia.entity';

/** Repositorio TypeORM falso en memoria: solo los metodos que usa el servicio. */
function repoFalso<T extends { id: string }>(filas: T[]): Repository<T> {
  const repo = {
    findOne: ({ where }: { where: { id: string } }): Promise<T | null> =>
      Promise.resolve(filas.find((f) => f.id === where.id) ?? null),
    countBy: ({ id }: { id: string }): Promise<number> =>
      Promise.resolve(filas.filter((f) => f.id === id).length),
    save: (fila: T): Promise<T> => {
      const i = filas.findIndex((f) => f.id === fila.id);
      if (i >= 0) filas[i] = fila;
      else filas.push(fila);
      return Promise.resolve(fila);
    },
  };
  return repo as unknown as Repository<T>;
}

function preparar(): CatalogosAdminService {
  const mares = [
    Object.assign(new Mar(), {
      id: 'm-east-blue',
      nombre: 'East Blue',
      tipo: TipoMar.CUATRO_MARES,
      activo: true,
    }),
  ];
  const zonas = [
    Object.assign(new ZonaInfluencia(), {
      id: 'z-loguetown',
      marId: 'm-east-blue',
      nombre: 'Loguetown',
      descripcion: null,
      activo: true,
    }),
    Object.assign(new ZonaInfluencia(), {
      id: 'z-cerrada',
      marId: 'm-east-blue',
      nombre: 'Cerrada',
      descripcion: null,
      activo: false,
    }),
  ];
  const bases = [
    Object.assign(new BaseNaval(), {
      id: 'b-153',
      nombre: 'Base 153',
      zonaInfluenciaId: 'z-loguetown',
      version: 3,
    }),
  ];
  return new CatalogosAdminService(repoFalso(mares), repoFalso(zonas), repoFalso(bases));
}

describe('CatalogosAdminService', () => {
  it('crea una zona dentro de un mar existente con id legible', async () => {
    const zona = await preparar().crearZona({
      id: 'z-shells',
      marId: 'm-east-blue',
      nombre: 'Shells Town',
    });
    expect(zona.id).toBe('z-shells');
    expect(zona.activo).toBe(true);
  });

  it('rechaza una zona en un mar inexistente', async () => {
    await expect(preparar().crearZona({ marId: 'm-nada', nombre: 'X' })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('registra una base solo en una zona activa', async () => {
    const servicio = preparar();
    const datos = { nombre: 'Base G-8', ubicacion: 'Navarone', comandanteNombre: 'Jonathan' };
    const base = await servicio.crearBase({ ...datos, zonaInfluenciaId: 'z-loguetown' });
    expect(base.estado).toBe('ACTIVA');
    await expect(servicio.crearBase({ ...datos, zonaInfluenciaId: 'z-cerrada' })).rejects.toThrow(
      DomainError,
    );
  });

  it('actualizar una base exige la version vigente si se envia', async () => {
    await expect(preparar().actualizarBase('b-153', { version: 1 })).rejects.toThrow(
      ConcurrencyError,
    );
  });
});
