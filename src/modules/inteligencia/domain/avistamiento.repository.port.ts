import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { Avistamiento, EstadoVerificacion } from './avistamiento.entity';

export const AVISTAMIENTO_REPOSITORY = Symbol('AVISTAMIENTO_REPOSITORY');

/** RF-3 "consultar avistamientos por criminal, zona, fecha o estado de verificacion". */
export interface FiltroAvistamientos {
  readonly q?: string;
  readonly criminalId?: string;
  readonly zonaInfluenciaId?: string;
  readonly estadoVerificacion?: EstadoVerificacion;
  readonly desde?: Date;
  readonly hasta?: Date;
  readonly page: number;
  readonly limit: number;
  readonly order: 'ASC' | 'DESC';
}

export interface AvistamientoRepositoryPort {
  /** Incluye la relacion `criminal` para mostrar su nombre. */
  buscarPorId(id: string): Promise<Avistamiento | null>;
  listar(filtro: FiltroAvistamientos): Promise<PageResult<Avistamiento>>;
  guardar(avistamiento: Avistamiento): Promise<Avistamiento>;
  eliminar(id: string): Promise<void>;
}
