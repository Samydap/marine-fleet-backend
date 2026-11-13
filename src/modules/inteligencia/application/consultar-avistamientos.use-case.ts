import { Inject, Injectable } from '@nestjs/common';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import type { Avistamiento } from '../domain/avistamiento.entity';
import {
  AVISTAMIENTO_REPOSITORY,
  type AvistamientoRepositoryPort,
  type FiltroAvistamientos,
} from '../domain/avistamiento.repository.port';

/** RF-3 "consultar avistamientos por criminal, zona, fecha o estado de verificacion". */
@Injectable()
export class ConsultarAvistamientosUseCase implements UseCase<
  FiltroAvistamientos,
  PageResult<Avistamiento>
> {
  constructor(
    @Inject(AVISTAMIENTO_REPOSITORY) private readonly avistamientos: AvistamientoRepositoryPort,
  ) {}

  execute(filtro: FiltroAvistamientos): Promise<PageResult<Avistamiento>> {
    if (filtro.desde && filtro.hasta && filtro.desde > filtro.hasta) {
      throw new DomainError('La fecha "desde" no puede ser posterior a "hasta".', 'RANGO_INVALIDO');
    }
    return this.avistamientos.listar(filtro);
  }
}

@Injectable()
export class ObtenerAvistamientoUseCase implements UseCase<string, Avistamiento> {
  constructor(
    @Inject(AVISTAMIENTO_REPOSITORY) private readonly avistamientos: AvistamientoRepositoryPort,
  ) {}

  async execute(id: string): Promise<Avistamiento> {
    const avistamiento = await this.avistamientos.buscarPorId(id);
    if (!avistamiento) {
      throw new NotFoundError('avistamiento', id);
    }
    return avistamiento;
  }
}
