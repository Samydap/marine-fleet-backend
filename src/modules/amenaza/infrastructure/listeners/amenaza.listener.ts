import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTOS } from '../../../../shared/domain/events/domain-event';
import type {
  CriminalActualizadoEvent,
  CriminalRegistradoEvent,
} from '../../../../shared/domain/events/eventos.contracts';
import { ClasificarCriminalUseCase } from '../../application/clasificar-criminal.use-case';

/**
 * Lo que hace la clasificacion AUTOMATICA: nadie pulsa un boton, el nivel se
 * recalcula cuando el criminal se registra o cuando cambia algo que lo afecta
 * (su recompensa vigente o su zona de influencia).
 */
@Injectable()
export class AmenazaListener {
  private readonly logger = new Logger(AmenazaListener.name);

  constructor(private readonly clasificar: ClasificarCriminalUseCase) {}

  @OnEvent(EVENTOS.CRIMINAL_REGISTRADO)
  async alRegistrarCriminal(evento: CriminalRegistradoEvent): Promise<void> {
    await this.clasificarSinFallar(evento.criminalId, evento.usuarioId);
  }

  @OnEvent(EVENTOS.CRIMINAL_ACTUALIZADO)
  async alActualizarCriminal(evento: CriminalActualizadoEvent): Promise<void> {
    if (evento.motivos.includes('RECOMPENSA') || evento.motivos.includes('ZONA')) {
      await this.clasificarSinFallar(evento.criminalId, evento.usuarioId);
    }
  }

  private async clasificarSinFallar(criminalId: string, usuarioId: string | null): Promise<void> {
    try {
      await this.clasificar.execute({ criminalId, usuarioId });
    } catch (error) {
      this.logger.error(
        `No se pudo clasificar ${criminalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
