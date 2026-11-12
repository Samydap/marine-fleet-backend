import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import {
  AVISTAMIENTO_REPOSITORY,
  type AvistamientoRepositoryPort,
} from '../domain/avistamiento.repository.port';

/** RF-3. Borra un avistamiento cargado por error. Uno VERIFICADO no se borra: se descarta. */
@Injectable()
export class EliminarAvistamientoUseCase implements UseCase<string, void> {
  constructor(
    @Inject(AVISTAMIENTO_REPOSITORY) private readonly avistamientos: AvistamientoRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const avistamiento = await this.avistamientos.buscarPorId(id);
    if (!avistamiento) {
      throw new NotFoundError('avistamiento', id);
    }
    avistamiento.asegurarModificable();
    await this.avistamientos.eliminar(id);
  }
}
