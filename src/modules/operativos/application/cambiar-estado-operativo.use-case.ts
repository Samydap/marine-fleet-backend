import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { EstadoOperativo } from '../domain/estado-operativo.enum';
import type { Operativo } from '../domain/operativo.entity';
import {
  OPERATIVO_REPOSITORY,
  type OperativoRepositoryPort,
} from '../domain/operativo.repository.port';
import {
  cargarOperativo,
  eventoOperativo,
  verificarVersion,
  type UsuarioOperativo,
} from './operativo-helpers';

export interface CambiarEstadoOperativoInput {
  readonly operativoId: string;
  readonly estado: EstadoOperativo;
  readonly version: number;
  readonly usuario: UsuarioOperativo;
}

/**
 * RF-4 "actualizar el estado de un operativo (planeado, en curso, completado,
 * abortado) y que dicho estado sea visible para todas las bases asignadas".
 *
 * La transicion la valida la entidad. "Completado" no pasa por aqui sino por el
 * cierre, que exige resultado final. La visibilidad para todas las bases la da
 * el evento OPERATIVO_ACTUALIZADO (SSE + notificaciones).
 */
@Injectable()
export class CambiarEstadoOperativoUseCase implements UseCase<
  CambiarEstadoOperativoInput,
  Operativo
> {
  constructor(
    @Inject(OPERATIVO_REPOSITORY) private readonly operativos: OperativoRepositoryPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: CambiarEstadoOperativoInput): Promise<Operativo> {
    const operativo = await cargarOperativo(this.operativos, input.operativoId, input.usuario);
    verificarVersion(operativo, input.version);

    operativo.cambiarEstado(input.estado);
    const guardado = await this.operativos.guardar(operativo);

    this.eventos.emit(
      EVENTOS.OPERATIVO_ACTUALIZADO,
      eventoOperativo(guardado, 'ESTADO', input.usuario.id),
    );
    return guardado;
  }
}
