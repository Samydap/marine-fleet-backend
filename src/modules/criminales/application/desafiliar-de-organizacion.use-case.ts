import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { CriminalActualizadoEvent } from '../../../shared/domain/events/eventos.contracts';
import type { Membresia } from '../domain/membresia.entity';
import {
  MEMBRESIA_REPOSITORY,
  type MembresiaRepositoryPort,
} from '../domain/membresia.repository.port';
import { publicarEvento } from './publicar-evento';

export interface DesafiliarInput {
  readonly criminalId: string;
  readonly organizacionId: string;
  readonly usuarioId: string;
}

/**
 * RF-1. Cierra la afiliacion vigente (`vigente = 0`, `fecha_salida`). No borra
 * la fila: la membresia es historica y sirve para saber a que tripulacion
 * pertenecio el criminal en el pasado.
 */
@Injectable()
export class DesafiliarDeOrganizacionUseCase implements UseCase<DesafiliarInput, Membresia> {
  constructor(
    @Inject(MEMBRESIA_REPOSITORY) private readonly membresias: MembresiaRepositoryPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: DesafiliarInput): Promise<Membresia> {
    const membresia = await this.membresias.buscarVigente(input.criminalId, input.organizacionId);
    if (!membresia) {
      throw new NotFoundError(
        'afiliacion vigente',
        `${input.criminalId} -> ${input.organizacionId}`,
      );
    }

    membresia.cerrar();
    const guardada = await this.membresias.guardar(membresia);

    const evento: CriminalActualizadoEvent = {
      criminalId: input.criminalId,
      usuarioId: input.usuarioId,
      motivos: ['AFILIACION'],
    };
    await publicarEvento(this.eventos, EVENTOS.CRIMINAL_ACTUALIZADO, evento);

    return guardada;
  }
}
