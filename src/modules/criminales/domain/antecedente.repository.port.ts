import type { Antecedente } from './antecedente.entity';

export const ANTECEDENTE_REPOSITORY = Symbol('ANTECEDENTE_REPOSITORY');

/** Delitos registrados de un criminal (tabla `antecedentes`). */
export interface AntecedenteRepositoryPort {
  listarPorCriminal(criminalId: string): Promise<Antecedente[]>;
  guardar(antecedente: Antecedente): Promise<Antecedente>;
}
