import { Inject, Injectable } from '@nestjs/common';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import type { Incidente } from '../domain/incidente.entity';
import {
  INCIDENTE_REPOSITORY,
  type FiltroIncidentes,
  type IncidenteRepositoryPort,
} from '../domain/incidente.repository.port';

/**
 * RF-6 "consultar el historial de enfrentamientos por criminal, base naval u
 * operativo". Un solo caso de uso con filtro: los tres endpoints del controller
 * son atajos que fijan uno de los criterios.
 *
 * Lectura NO limitada por base: el historial de un criminal es inteligencia
 * compartida entre todas las bases (por eso el sistema es centralizado).
 */
@Injectable()
export class HistorialIncidentesUseCase implements UseCase<
  FiltroIncidentes,
  PageResult<Incidente>
> {
  constructor(@Inject(INCIDENTE_REPOSITORY) private readonly incidentes: IncidenteRepositoryPort) {}

  execute(filtro: FiltroIncidentes): Promise<PageResult<Incidente>> {
    return this.incidentes.listar(filtro);
  }
}

@Injectable()
export class ObtenerIncidenteUseCase implements UseCase<string, Incidente> {
  constructor(@Inject(INCIDENTE_REPOSITORY) private readonly incidentes: IncidenteRepositoryPort) {}

  async execute(id: string): Promise<Incidente> {
    const incidente = await this.incidentes.buscarPorId(id);
    if (!incidente) throw new NotFoundError('enfrentamiento', id);
    return incidente;
  }
}
