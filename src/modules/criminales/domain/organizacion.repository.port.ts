import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { CategoriaOrganizacion, TipoAgrupacion } from './estado-criminal.enum';
import type { Organizacion } from './organizacion.entity';

export const ORGANIZACION_REPOSITORY = Symbol('ORGANIZACION_REPOSITORY');

export interface FiltroOrganizaciones {
  readonly q?: string;
  readonly categoria?: CategoriaOrganizacion;
  readonly tipoAgrupacion?: TipoAgrupacion;
  readonly zonaInfluenciaId?: string;
  readonly activa?: boolean;
  readonly page: number;
  readonly limit: number;
}

/** Tripulaciones, organizaciones y bandas (tabla `organizaciones`). */
export interface OrganizacionRepositoryPort {
  buscarPorId(id: string): Promise<Organizacion | null>;
  buscarPorNombre(nombre: string): Promise<Organizacion | null>;
  listar(filtro: FiltroOrganizaciones): Promise<PageResult<Organizacion>>;
  guardar(organizacion: Organizacion): Promise<Organizacion>;
}
