import { Inject, Injectable } from '@nestjs/common';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { UseCase } from '../../../shared/application/use-case.interface';
import type { Criminal } from '../domain/criminal.entity';
import {
  CRIMINAL_REPOSITORY,
  type CriminalRepositoryPort,
  type FiltroCriminales,
} from '../domain/criminal.repository.port';

@Injectable()
export class BuscarCriminalesUseCase implements UseCase<FiltroCriminales, PageResult<Criminal>> {
  constructor(@Inject(CRIMINAL_REPOSITORY) private readonly repositorio: CriminalRepositoryPort) {}

  execute(filtro: FiltroCriminales): Promise<PageResult<Criminal>> {
    return this.repositorio.listar(filtro);
  }
}
