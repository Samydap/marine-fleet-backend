import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import type { Cartel } from '../domain/cartel.entity';
import { CARTEL_REPOSITORY, type CartelRepositoryPort } from '../domain/cartel.repository.port';

/** RF-2. Historial de versiones del cartel: cada una conserva su instantanea. */
@Injectable()
export class ListarVersionesCartelUseCase implements UseCase<string, Cartel[]> {
  constructor(@Inject(CARTEL_REPOSITORY) private readonly carteles: CartelRepositoryPort) {}

  execute(criminalId: string): Promise<Cartel[]> {
    return this.carteles.listarVersiones(criminalId);
  }
}
