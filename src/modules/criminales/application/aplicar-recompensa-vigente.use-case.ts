import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type {
  CriminalActualizadoEvent,
  RecompensaVigenteEvent,
} from '../../../shared/domain/events/eventos.contracts';
import {
  CRIMINAL_REPOSITORY,
  type CriminalRepositoryPort,
} from '../domain/criminal.repository.port';
import { publicarEvento } from './publicar-evento';

/**
 * RF-1 "registrar y actualizar el monto de la recompensa" + beneficio
 * "actualizacion inmediata de recompensas".
 *
 * Lo dispara el evento RECOMPENSA_VIGENTE (modulo Recompensas). Recompensas NO
 * escribe la tabla criminales: respeta la frontera del agregado. Este modulo
 * actualiza su copia `recompensa_vigente_monto` y avisa con CRIMINAL_ACTUALIZADO
 * (motivo RECOMPENSA), que Amenaza usa para reclasificar y Carteles para emitir
 * un cartel nuevo.
 */
@Injectable()
export class AplicarRecompensaVigenteUseCase implements UseCase<RecompensaVigenteEvent, void> {
  constructor(
    @Inject(CRIMINAL_REPOSITORY) private readonly repositorio: CriminalRepositoryPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(evento: RecompensaVigenteEvent): Promise<void> {
    const criminal = await this.repositorio.buscarPorId(evento.criminalId);
    if (!criminal) throw new NotFoundError('criminal', evento.criminalId);

    criminal.aplicarRecompensaVigente(evento.monto, evento.usuarioId);
    await this.repositorio.guardar(criminal);

    const actualizado: CriminalActualizadoEvent = {
      criminalId: criminal.id,
      usuarioId: evento.usuarioId,
      motivos: ['RECOMPENSA'],
    };
    await publicarEvento(this.eventos, EVENTOS.CRIMINAL_ACTUALIZADO, actualizado);
  }
}
