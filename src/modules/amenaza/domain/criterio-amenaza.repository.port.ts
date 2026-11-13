import type { CriterioAmenaza } from './criterio-amenaza.entity';
import type { CriterioVigente } from './motor-clasificacion';

export const CRITERIO_AMENAZA_REPOSITORY = Symbol('CRITERIO_AMENAZA_REPOSITORY');

export interface CriterioAmenazaRepositoryPort {
  listarVigentes(): Promise<CriterioAmenaza[]>;
  /** Todos, vigentes y retirados, del mas reciente al mas antiguo. */
  listarHistorial(): Promise<CriterioAmenaza[]>;
  /**
   * Retira los vigentes (vigente=0, vigente_hasta=ahora) e inserta los nuevos
   * en UNA transaccion: nunca hay un instante sin criterios.
   */
  reemplazarVigentes(
    nuevos: readonly CriterioVigente[],
    usuarioId: string,
    motivo: string,
  ): Promise<CriterioAmenaza[]>;
}
