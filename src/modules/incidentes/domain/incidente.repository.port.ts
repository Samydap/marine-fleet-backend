import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { Incidente } from './incidente.entity';
import type { Participante } from './participante.entity';
import type { TipoIncidente } from './resultado-enfrentamiento.enum';

export const INCIDENTE_REPOSITORY = Symbol('INCIDENTE_REPOSITORY');

export interface FiltroIncidentes {
  readonly criminalId?: string;
  readonly baseNavalId?: string;
  readonly operativoId?: string;
  readonly tipo?: TipoIncidente;
  readonly desde?: Date;
  readonly hasta?: Date;
  readonly page: number;
  readonly limit: number;
  readonly order: 'ASC' | 'DESC';
}

export interface IncidenteRepositoryPort {
  /** Carga el incidente con sus participantes. */
  buscarPorId(id: string): Promise<Incidente | null>;
  listar(filtro: FiltroIncidentes): Promise<PageResult<Incidente>>;
  /** Guarda la fila del incidente (sin participantes). */
  guardar(incidente: Incidente): Promise<Incidente>;
  guardarParticipantes(participantes: Participante[]): Promise<void>;
}
