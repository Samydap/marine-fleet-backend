import type { AnalisisRiesgo } from './analisis-riesgo.entity';

export const ANALISIS_RIESGO_REPOSITORY = Symbol('ANALISIS_RIESGO_REPOSITORY');

export interface AnalisisRiesgoRepositoryPort {
  guardar(analisis: AnalisisRiesgo): Promise<AnalisisRiesgo>;
  listarPorCriminal(criminalId: string, limite: number): Promise<AnalisisRiesgo[]>;
}
