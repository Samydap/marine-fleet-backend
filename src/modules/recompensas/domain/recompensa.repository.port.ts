import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { EstadoRecompensa } from './estado-recompensa.enum';
import type { Recompensa } from './recompensa.entity';

export const RECOMPENSA_REPOSITORY = Symbol('RECOMPENSA_REPOSITORY');

export interface FiltroRecompensas {
  readonly criminalId?: string;
  readonly estado?: EstadoRecompensa;
  readonly requiereValidacion?: boolean;
  readonly page: number;
  readonly limit: number;
}

export interface RecompensaRepositoryPort {
  buscarPorId(id: string): Promise<Recompensa | null>;
  buscarVigente(criminalId: string): Promise<Recompensa | null>;
  buscarPendiente(criminalId: string): Promise<Recompensa | null>;
  listar(filtro: FiltroRecompensas): Promise<PageResult<Recompensa>>;
  historialPorCriminal(criminalId: string): Promise<Recompensa[]>;
  guardar(recompensa: Recompensa): Promise<Recompensa>;
  /**
   * Guarda `nueva` ya en estado VIGENTE y pasa la vigente anterior a HISTORICA
   * en UNA transaccion: nunca puede haber dos vigentes ni cero por un fallo a
   * mitad de camino. Devuelve la que quedo historica, si habia.
   */
  activarReemplazandoVigente(nueva: Recompensa): Promise<Recompensa | null>;
}
