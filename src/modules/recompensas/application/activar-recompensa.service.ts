import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { RecompensaVigenteEvent } from '../../../shared/domain/events/eventos.contracts';
import type { Recompensa } from '../domain/recompensa.entity';
import {
  RECOMPENSA_REPOSITORY,
  type RecompensaRepositoryPort,
} from '../domain/recompensa.repository.port';
import { publicarEvento } from './publicar-evento';

/**
 * Paso comun de "solicitar" (monto bajo) y "validar" (monto alto): persistir la
 * recompensa VIGENTE reemplazando a la anterior y avisar al resto del sistema.
 *
 * RECOMPENSA_VIGENTE lo escuchan:
 *  - Criminales: actualiza `recompensa_vigente_monto` y emite CRIMINAL_ACTUALIZADO.
 *  - (en cadena) Amenaza reclasifica y Carteles emite un cartel nuevo.
 */
@Injectable()
export class ActivarRecompensaService {
  constructor(
    @Inject(RECOMPENSA_REPOSITORY) private readonly recompensas: RecompensaRepositoryPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async activar(recompensa: Recompensa, usuarioId: string): Promise<void> {
    await this.recompensas.activarReemplazandoVigente(recompensa);

    const evento: RecompensaVigenteEvent = {
      recompensaId: recompensa.id,
      criminalId: recompensa.criminalId,
      monto: recompensa.monto,
      moneda: recompensa.moneda,
      usuarioId,
    };
    await publicarEvento(this.eventos, EVENTOS.RECOMPENSA_VIGENTE, evento);
  }
}
