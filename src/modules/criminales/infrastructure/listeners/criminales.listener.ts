import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTOS } from '../../../../shared/domain/events/domain-event';
import type {
  IncidenteCerradoEvent,
  RecompensaVigenteEvent,
} from '../../../../shared/domain/events/eventos.contracts';
import { AplicarDesenlaceIncidenteUseCase } from '../../application/aplicar-desenlace-incidente.use-case';
import { AplicarRecompensaVigenteUseCase } from '../../application/aplicar-recompensa-vigente.use-case';

/**
 * Oyentes de eventos de OTROS modulos que afectan al agregado Criminal.
 *
 * Es infraestructura (adaptador de entrada, como un controller pero para
 * eventos): traduce el evento a un caso de uso. Un oyente nunca deja escapar
 * una excepcion: el modulo que emitio no debe fallar por culpa de este.
 */
@Injectable()
export class CriminalesListener {
  private readonly logger = new Logger(CriminalesListener.name);

  constructor(
    private readonly aplicarRecompensa: AplicarRecompensaVigenteUseCase,
    private readonly aplicarDesenlace: AplicarDesenlaceIncidenteUseCase,
  ) {}

  @OnEvent(EVENTOS.RECOMPENSA_VIGENTE)
  async alActivarseRecompensa(evento: RecompensaVigenteEvent): Promise<void> {
    try {
      await this.aplicarRecompensa.execute(evento);
    } catch (error) {
      this.registrarError(EVENTOS.RECOMPENSA_VIGENTE, error);
    }
  }

  @OnEvent(EVENTOS.INCIDENTE_CERRADO)
  async alCerrarseIncidente(evento: IncidenteCerradoEvent): Promise<void> {
    try {
      const cambiados = await this.aplicarDesenlace.execute(evento);
      if (cambiados > 0) {
        this.logger.log(
          `Incidente ${evento.incidenteId}: ${cambiados} criminal(es) cambiaron de estado.`,
        );
      }
    } catch (error) {
      this.registrarError(EVENTOS.INCIDENTE_CERRADO, error);
    }
  }

  private registrarError(evento: string, error: unknown): void {
    this.logger.error(
      `Fallo al procesar ${evento}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
