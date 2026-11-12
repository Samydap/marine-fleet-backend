import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import type { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';
import {
  CRIMINAL_READER,
  type CriminalReaderPort,
} from '../../criminales/domain/criminal.repository.port';
import type { AnalisisRiesgo } from '../domain/analisis-riesgo.entity';
import {
  ANALISIS_RIESGO_REPOSITORY,
  type AnalisisRiesgoRepositoryPort,
} from '../domain/analisis-riesgo.repository.port';
import type { CriterioAmenaza } from '../domain/criterio-amenaza.entity';
import {
  CRITERIO_AMENAZA_REPOSITORY,
  type CriterioAmenazaRepositoryPort,
} from '../domain/criterio-amenaza.repository.port';

export interface DistribucionAmenaza {
  readonly total: number;
  readonly soloActivos: boolean;
  readonly niveles: Array<{ nivel: NivelAmenaza; total: number; porcentaje: number }>;
}

/** RF-5. Lecturas: criterios, historial de criterios, distribucion y analisis. */
@Injectable()
export class ConsultarAmenazaUseCase {
  constructor(
    @Inject(CRITERIO_AMENAZA_REPOSITORY) private readonly criterios: CriterioAmenazaRepositoryPort,
    @Inject(ANALISIS_RIESGO_REPOSITORY) private readonly analisis: AnalisisRiesgoRepositoryPort,
    @Inject(CRIMINAL_READER) private readonly criminales: CriminalReaderPort,
  ) {}

  criteriosVigentes(): Promise<CriterioAmenaza[]> {
    return this.criterios.listarVigentes();
  }

  historialCriterios(): Promise<CriterioAmenaza[]> {
    return this.criterios.listarHistorial();
  }

  /** Datos para el grafico de distribucion de riesgo ("simple y claro"). */
  async distribucion(soloActivos: boolean): Promise<DistribucionAmenaza> {
    const conteo = await this.criminales.contarPorNivelAmenaza(soloActivos);
    const total = conteo.reduce((suma, c) => suma + c.total, 0);
    return {
      total,
      soloActivos,
      niveles: conteo.map((c) => ({
        ...c,
        porcentaje: total === 0 ? 0 : Math.round((c.total / total) * 1000) / 10,
      })),
    };
  }

  async historialAnalisis(criminalId: string, limite: number): Promise<AnalisisRiesgo[]> {
    if (!(await this.criminales.existe(criminalId))) {
      throw new NotFoundError('criminal', criminalId);
    }
    return this.analisis.listarPorCriminal(criminalId, limite);
  }
}
