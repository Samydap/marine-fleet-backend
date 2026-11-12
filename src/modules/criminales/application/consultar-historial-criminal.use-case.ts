import { Inject, Injectable } from '@nestjs/common';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import {
  CRIMINAL_REPOSITORY,
  type CriminalRepositoryPort,
} from '../domain/criminal.repository.port';
import {
  HISTORIAL_CRIMINAL_REPOSITORY,
  type EntradaHistorial,
  type FiltroHistorial,
  type HistorialCriminalRepositoryPort,
} from '../domain/historial.repository.port';

/**
 * RF-1 "consultar el historial de modificaciones de un criminal (recompensa,
 * estado, afiliacion, datos personales)" + RNF de trazabilidad.
 *
 * Lee lo que escribieron los triggers: cada fila dice que campo cambio, de que
 * valor a cual, quien y cuando.
 */
@Injectable()
export class ConsultarHistorialCriminalUseCase implements UseCase<
  FiltroHistorial,
  PageResult<EntradaHistorial>
> {
  constructor(
    @Inject(CRIMINAL_REPOSITORY) private readonly criminales: CriminalRepositoryPort,
    @Inject(HISTORIAL_CRIMINAL_REPOSITORY)
    private readonly historial: HistorialCriminalRepositoryPort,
  ) {}

  async execute(filtro: FiltroHistorial): Promise<PageResult<EntradaHistorial>> {
    if (!(await this.criminales.existe(filtro.criminalId))) {
      throw new NotFoundError('criminal', filtro.criminalId);
    }
    return this.historial.listar(filtro);
  }
}
