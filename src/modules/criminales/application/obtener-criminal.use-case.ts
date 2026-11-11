import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import type { Criminal } from '../domain/criminal.entity';
import {
  CRIMINAL_REPOSITORY,
  type CriminalRepositoryPort,
} from '../domain/criminal.repository.port';

@Injectable()
export class ObtenerCriminalUseCase implements UseCase<string, Criminal> {
  constructor(@Inject(CRIMINAL_REPOSITORY) private readonly repositorio: CriminalRepositoryPort) {}

  async execute(id: string): Promise<Criminal> {
    const criminal = await this.repositorio.buscarPorId(id);
    if (!criminal) {
      throw new NotFoundError('criminal', id);
    }
    return criminal;
  }
}
