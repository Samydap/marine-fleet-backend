import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { Auditoria } from './auditoria.entity';

export const AUDITORIA_REPOSITORY = Symbol('AUDITORIA_REPOSITORY');

export interface FiltroAuditoria {
  readonly usuarioId?: string;
  readonly accion?: string;
  readonly entidad?: string;
  readonly entidadId?: string;
  readonly exitoso?: boolean;
  readonly desde?: Date;
  readonly hasta?: Date;
  readonly page: number;
  readonly limit: number;
  readonly order: 'ASC' | 'DESC';
}

/** Lectura de la bitacora. La escritura va por AUDITORIA_WRITER (shared/domain). */
export interface AuditoriaRepositoryPort {
  listar(filtro: FiltroAuditoria): Promise<PageResult<Auditoria>>;
}
