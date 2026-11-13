import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { Notificacion } from '../domain/notificacion.entity';
import { construirNotificaciones } from '../domain/politica-notificacion';
import {
  NOTIFICACION_REPOSITORY,
  type NotificacionRepositoryPort,
} from '../domain/sincronizacion.ports';

export interface EventoRecibido {
  readonly evento: string;
  readonly datos: unknown;
}

/**
 * Convierte un evento del sistema en notificaciones persistentes por base
 * (la politica decide quien recibe que). Devuelve cuantas se crearon.
 */
@Injectable()
export class RegistrarNotificacionesUseCase implements UseCase<EventoRecibido, number> {
  constructor(
    @Inject(NOTIFICACION_REPOSITORY) private readonly repositorio: NotificacionRepositoryPort,
  ) {}

  async execute(input: EventoRecibido): Promise<number> {
    const nuevas = construirNotificaciones(input.evento, input.datos).map((n) =>
      Object.assign(new Notificacion(), {
        ...n,
        id: randomUUID(),
        usuarioId: null,
        leida: false,
      }),
    );
    if (nuevas.length > 0) await this.repositorio.guardarVarias(nuevas);
    return nuevas.length;
  }
}
