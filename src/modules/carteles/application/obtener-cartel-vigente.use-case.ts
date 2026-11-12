import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import type { Cartel } from '../domain/cartel.entity';
import { CARTEL_REPOSITORY, type CartelRepositoryPort } from '../domain/cartel.repository.port';

/** RF-2. Cartel vigente de un criminal (el que se muestra y se imprime hoy). */
@Injectable()
export class ObtenerCartelVigenteUseCase implements UseCase<string, Cartel> {
  constructor(@Inject(CARTEL_REPOSITORY) private readonly carteles: CartelRepositoryPort) {}

  async execute(criminalId: string): Promise<Cartel> {
    const cartel = await this.carteles.buscarVigente(criminalId);
    if (!cartel) {
      throw new NotFoundError('cartel vigente para el criminal', criminalId);
    }
    return cartel;
  }
}
