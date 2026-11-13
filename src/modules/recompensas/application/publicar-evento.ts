import { Logger } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';

const logger = new Logger('EventosRecompensas');

/**
 * Publica un evento de dominio y ESPERA a los oyentes (emitAsync).
 *
 * Se espera para que, cuando la peticion responde, la clasificacion de amenaza
 * y el cartel ya esten actualizados. Si un oyente de otro modulo falla, se
 * registra y se sigue: un cartel que no se genero no debe deshacer la recompensa,
 * que ya quedo guardada.
 */
export async function publicarEvento(
  eventos: EventEmitter2,
  nombre: string,
  payload: object,
): Promise<void> {
  try {
    await eventos.emitAsync(nombre, payload);
  } catch (error) {
    logger.error(
      `Un oyente de ${nombre} fallo: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
