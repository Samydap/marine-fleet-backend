import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTOS } from '../../../../shared/domain/events/domain-event';
import { CanalSincronizacion } from '../../application/canal-sincronizacion.service';
import { RegistrarNotificacionesUseCase } from '../../application/registrar-notificaciones.use-case';
import { EVENTOS_NOTIFICABLES } from '../../domain/politica-notificacion';

/**
 * Oyente de TODOS los eventos del contrato (shared/domain/events). El
 * EventEmitterModule no tiene comodines activados, asi que los registra uno por
 * uno a partir de EVENTOS: un evento nuevo en el contrato queda sincronizado sin
 * tocar este archivo.
 *
 * Por cada hecho:
 *  1. lo publica en el canal (sale por SSE a las bases conectadas);
 *  2. si es notificable, lo persiste como notificacion de las bases afectadas.
 *
 * Un fallo aqui se registra y NO se propaga: la sincronizacion nunca debe
 * tumbar el caso de uso que origino el evento.
 */
@Injectable()
export class EventosSincronizacionListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Sincronizacion');
  private readonly desuscripciones: Array<() => void> = [];

  constructor(
    private readonly eventos: EventEmitter2,
    private readonly canal: CanalSincronizacion,
    private readonly notificaciones: RegistrarNotificacionesUseCase,
  ) {}

  onModuleInit(): void {
    for (const nombre of Object.values(EVENTOS)) {
      const oyente = (datos: unknown): Promise<void> => this.atender(nombre, datos);
      this.eventos.on(nombre, oyente);
      this.desuscripciones.push(() => this.eventos.off(nombre, oyente));
    }
  }

  onModuleDestroy(): void {
    for (const desuscribir of this.desuscripciones) desuscribir();
  }

  async atender(evento: string, datos: unknown): Promise<void> {
    try {
      this.canal.publicar(evento, datos);
      if ((EVENTOS_NOTIFICABLES as readonly string[]).includes(evento)) {
        await this.notificaciones.execute({ evento, datos });
      }
    } catch (error) {
      this.logger.error(
        `No se pudo sincronizar ${evento}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
