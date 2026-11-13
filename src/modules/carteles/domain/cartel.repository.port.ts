import type { Cartel } from './cartel.entity';

export const CARTEL_REPOSITORY = Symbol('CARTEL_REPOSITORY');

export interface CartelRepositoryPort {
  buscarPorId(id: string): Promise<Cartel | null>;
  buscarVigente(criminalId: string): Promise<Cartel | null>;
  /** Todas las versiones, de la mas reciente a la mas antigua. */
  listarVersiones(criminalId: string): Promise<Cartel[]>;
  /**
   * Persiste la version nueva y marca la anterior como no vigente, en una sola
   * transaccion: nunca quedan dos carteles vigentes para el mismo criminal.
   */
  guardarNuevaVersion(cartel: Cartel): Promise<Cartel>;
  /** Ids de los criminales que ya tienen al menos un cartel. */
  listarCriminalesConCartel(): Promise<string[]>;
}
