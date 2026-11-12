import type { Membresia } from './membresia.entity';

export const MEMBRESIA_REPOSITORY = Symbol('MEMBRESIA_REPOSITORY');

/** Afiliaciones criminal <-> organizacion (tabla `membresias`). */
export interface MembresiaRepositoryPort {
  buscarVigente(criminalId: string, organizacionId: string): Promise<Membresia | null>;
  listarPorCriminal(criminalId: string, soloVigentes: boolean): Promise<Membresia[]>;
  /** Miembros de una organizacion con el criminal cargado. */
  listarPorOrganizacion(organizacionId: string, soloVigentes: boolean): Promise<Membresia[]>;
  guardar(membresia: Membresia): Promise<Membresia>;
}
