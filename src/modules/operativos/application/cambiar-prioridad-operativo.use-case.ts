import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { PrioridadOperativo } from '../domain/estado-operativo.enum';
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

export interface CambiarPrioridadInput {
  readonly operativoId: string;
  readonly prioridad: PrioridadOperativo;
  readonly version: number;
  readonly usuario: UsuarioOperativo;
}

/**
 * RF-4 "notificar a las bases navales asignadas cuando cambie el estado o la
 * prioridad de un operativo": este caso de uso cambia la prioridad y publica el
 * evento que dispara la notificacion.
 */
@Injectable()
export class CambiarPrioridadOperativoUseCase implements UseCase<CambiarPrioridadInput, Operativo> {
  constructor(
    @Inject(OPERATIVO_REPOSITORY) private readonly operativos: OperativoRepositoryPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: CambiarPrioridadInput): Promise<Operativo> {
    const operativo = await cargarOperativo(this.operativos, input.operativoId, input.usuario);
    verificarVersion(operativo, input.version);

    if (operativo.prioridad === input.prioridad) {
      return operativo;
    }

    operativo.cambiarPrioridad(input.prioridad);
    const guardado = await this.operativos.guardar(operativo);

    this.eventos.emit(
      EVENTOS.OPERATIVO_ACTUALIZADO,
      eventoOperativo(guardado, 'PRIORIDAD', input.usuario.id),
    );
    return guardado;
  }
}
