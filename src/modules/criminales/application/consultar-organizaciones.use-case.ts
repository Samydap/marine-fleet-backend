import { Inject, Injectable } from '@nestjs/common';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { RolMembresia } from '../domain/estado-criminal.enum';
import type { Membresia } from '../domain/membresia.entity';
import {
  MEMBRESIA_REPOSITORY,
  type MembresiaRepositoryPort,
} from '../domain/membresia.repository.port';
import type { Organizacion } from '../domain/organizacion.entity';
import {
  ORGANIZACION_REPOSITORY,
  type FiltroOrganizaciones,
  type OrganizacionRepositoryPort,
} from '../domain/organizacion.repository.port';

export interface OrganizacionConMiembros {
  readonly organizacion: Organizacion;
  readonly lider: Membresia | null;
  readonly miembros: Membresia[];
}

/**
 * RF-1. Consultas de organizaciones: listado filtrable por categoria y detalle
 * con lider y miembros conocidos. Son lecturas, por eso van juntas en un solo
 * servicio de consulta en lugar de dos casos de uso de una linea.
 */
@Injectable()
export class ConsultarOrganizacionesUseCase {
  constructor(
    @Inject(ORGANIZACION_REPOSITORY) private readonly organizaciones: OrganizacionRepositoryPort,
    @Inject(MEMBRESIA_REPOSITORY) private readonly membresias: MembresiaRepositoryPort,
  ) {}

  listar(filtro: FiltroOrganizaciones): Promise<PageResult<Organizacion>> {
    return this.organizaciones.listar(filtro);
  }

  async detalle(id: string, incluirHistoricos: boolean): Promise<OrganizacionConMiembros> {
    const organizacion = await this.organizaciones.buscarPorId(id);
    if (!organizacion) throw new NotFoundError('organizacion', id);

    const miembros = await this.membresias.listarPorOrganizacion(id, !incluirHistoricos);
    const lider = miembros.find((m) => m.vigente && m.rol === RolMembresia.LIDER) ?? null;
    return { organizacion, lider, miembros };
  }
}
