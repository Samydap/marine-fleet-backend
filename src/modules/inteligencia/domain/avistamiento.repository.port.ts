import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { Avistamiento } from './avistamiento.entity';

export const AVISTAMIENTO_REPOSITORY = Symbol('AVISTAMIENTO_REPOSITORY');

export interface FiltroAvistamientos {
  readonly q?: string;
  readonly criminalId?: string;
  readonly desde?: Date;
  readonly hasta?: Date;
  readonly page: number;
  readonly limit: number;
  readonly order: 'ASC' | 'DESC';
}

export interface AvistamientoRepositoryPort {
  buscarPorId(id: string): Promise<Avistamiento | null>;
  listar(filtro: FiltroAvistamientos): Promise<PageResult<Avistamiento>>;
  guardar(avistamiento: Avistamiento): Promise<Avistamiento>;
  eliminar(id: string): Promise<void>;
}
