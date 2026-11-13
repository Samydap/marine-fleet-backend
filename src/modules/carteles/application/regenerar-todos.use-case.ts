import { Inject, Injectable, Logger } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import {
  CRIMINAL_READER,
  type CriminalReaderPort,
} from '../../criminales/domain/criminal.repository.port';
import { MotivoGeneracion } from '../domain/cartel.entity';
import { CARTEL_REPOSITORY, type CartelRepositoryPort } from '../domain/cartel.repository.port';
import { GenerarCartelUseCase } from './generar-cartel.use-case';

export interface ResultadoRegeneracion {
  readonly generados: number;
  readonly omitidos: number;
  readonly fallidos: string[];
}

/**
 * Genera el cartel inicial de los criminales que no tienen ninguno: los que
 * entraron por el seed o por SQL directo, sin pasar por el evento de registro.
 */
@Injectable()
export class RegenerarTodosUseCase implements UseCase<string | null, ResultadoRegeneracion> {
  private readonly logger = new Logger(RegenerarTodosUseCase.name);

  constructor(
    @Inject(CRIMINAL_READER) private readonly criminales: CriminalReaderPort,
    @Inject(CARTEL_REPOSITORY) private readonly carteles: CartelRepositoryPort,
    private readonly generar: GenerarCartelUseCase,
  ) {}

  async execute(usuarioId: string | null): Promise<ResultadoRegeneracion> {
    const [todos, conCartel] = await Promise.all([
      this.criminales.listarTodosLosIds(),
      this.carteles.listarCriminalesConCartel(),
    ]);
    const yaTienen = new Set(conCartel);
    const pendientes = todos.filter((id) => !yaTienen.has(id));
    const fallidos: string[] = [];

    for (const criminalId of pendientes) {
      try {
        await this.generar.execute({ criminalId, motivo: MotivoGeneracion.REGISTRO, usuarioId });
      } catch (error) {
        fallidos.push(criminalId);
        this.logger.error(`No se pudo generar el cartel de ${criminalId}`, (error as Error).stack);
      }
    }

    return {
      generados: pendientes.length - fallidos.length,
      omitidos: yaTienen.size,
      fallidos,
    };
  }
}
