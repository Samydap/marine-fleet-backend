import { Inject, Injectable } from '@nestjs/common';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import {
  CRIMINAL_READER,
  type CriminalReaderPort,
} from '../../criminales/domain/criminal.repository.port';
import { EstadoRecompensa } from '../domain/estado-recompensa.enum';
import type { Recompensa } from '../domain/recompensa.entity';
import {
  RECOMPENSA_REPOSITORY,
  type FiltroRecompensas,
  type RecompensaRepositoryPort,
} from '../domain/recompensa.repository.port';

/** RF-1. Lecturas: listado, bandeja de pendientes del Almirante e historial por criminal. */
@Injectable()
export class ConsultarRecompensasUseCase {
  constructor(
    @Inject(RECOMPENSA_REPOSITORY) private readonly recompensas: RecompensaRepositoryPort,
    @Inject(CRIMINAL_READER) private readonly criminales: CriminalReaderPort,
  ) {}

  listar(filtro: FiltroRecompensas): Promise<PageResult<Recompensa>> {
    return this.recompensas.listar(filtro);
  }

  pendientes(page: number, limit: number): Promise<PageResult<Recompensa>> {
    return this.recompensas.listar({ estado: EstadoRecompensa.PENDIENTE_VALIDACION, page, limit });
  }

  async historial(criminalId: string): Promise<Recompensa[]> {
    if (!(await this.criminales.existe(criminalId))) {
      throw new NotFoundError('criminal', criminalId);
    }
    return this.recompensas.historialPorCriminal(criminalId);
  }

  async detalle(id: string): Promise<Recompensa> {
    const recompensa = await this.recompensas.buscarPorId(id);
    if (!recompensa) throw new NotFoundError('recompensa', id);
    return recompensa;
  }
}
