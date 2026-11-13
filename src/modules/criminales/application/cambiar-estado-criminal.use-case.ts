import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { ConcurrencyError } from '../../../shared/domain/errors/concurrency.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { CriminalEstadoCambiadoEvent } from '../../../shared/domain/events/eventos.contracts';
import type { Criminal } from '../domain/criminal.entity';
import {
  CRIMINAL_REPOSITORY,
  type CriminalRepositoryPort,
} from '../domain/criminal.repository.port';
import type { EstadoCriminal } from '../domain/estado-criminal.enum';
import { publicarEvento } from './publicar-evento';

export interface CambiarEstadoInput {
  readonly criminalId: string;
  readonly nuevoEstado: EstadoCriminal;
  readonly version: number;
  readonly usuarioId: string;
}

/**
 * RF-1 "dar de baja (marcar como capturado/muerto)" + RF-6. Muestra el manejo de concurrencia optimista con la columna
 * `version` del esquema: dos marines que capturan al mismo criminal a la vez no
 * se pisan en silencio, el segundo recibe 409.
 */
@Injectable()
export class CambiarEstadoCriminalUseCase implements UseCase<CambiarEstadoInput, Criminal> {
  constructor(
    @Inject(CRIMINAL_REPOSITORY) private readonly repositorio: CriminalRepositoryPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: CambiarEstadoInput): Promise<Criminal> {
    const criminal = await this.repositorio.buscarPorId(input.criminalId);
    if (!criminal) {
      throw new NotFoundError('criminal', input.criminalId);
    }

    if (Number(criminal.version) !== Number(input.version)) {
      throw new ConcurrencyError('criminal', input.criminalId, input.version);
    }

    const estadoAnterior = criminal.estado;
    criminal.cambiarEstado(input.nuevoEstado, input.usuarioId);
    if (estadoAnterior === criminal.estado) {
      return criminal;
    }
    const guardado = await this.repositorio.guardar(criminal);

    // Carteles escucha esto: un cartel de un criminal CAPTURADO cambia de texto.
    const evento: CriminalEstadoCambiadoEvent = {
      criminalId: guardado.id,
      estadoAnterior,
      estadoNuevo: guardado.estado,
      usuarioId: input.usuarioId,
    };
    await publicarEvento(this.eventos, EVENTOS.CRIMINAL_ESTADO_CAMBIADO, evento);

    return guardado;
  }
}
