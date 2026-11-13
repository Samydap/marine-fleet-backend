import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import type { Avistamiento, EstadoVerificacion } from '../domain/avistamiento.entity';
import {
  AVISTAMIENTO_REPOSITORY,
  type AvistamientoRepositoryPort,
} from '../domain/avistamiento.repository.port';

export interface VerificarAvistamientoInput {
  readonly id: string;
  readonly estado: EstadoVerificacion.VERIFICADO | EstadoVerificacion.DESCARTADO;
  readonly usuarioId: string;
}

/** RF-3. El Director de Inteligencia confirma o descarta un avistamiento. */
@Injectable()
export class VerificarAvistamientoUseCase implements UseCase<
  VerificarAvistamientoInput,
  Avistamiento
> {
  constructor(
    @Inject(AVISTAMIENTO_REPOSITORY) private readonly avistamientos: AvistamientoRepositoryPort,
  ) {}

  async execute(input: VerificarAvistamientoInput): Promise<Avistamiento> {
    const avistamiento = await this.avistamientos.buscarPorId(input.id);
    if (!avistamiento) {
      throw new NotFoundError('avistamiento', input.id);
    }
    avistamiento.cambiarVerificacion(input.estado, input.usuarioId);
    return this.avistamientos.guardar(avistamiento);
  }
}
