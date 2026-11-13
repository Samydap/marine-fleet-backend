import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { Operativo } from '../domain/operativo.entity';
import {
  OPERATIVO_REPOSITORY,
  REFERENCIAS_OPERATIVO,
  type OperativoRepositoryPort,
  type ReferenciasOperativoPort,
} from '../domain/operativo.repository.port';
import { ResponsableOperativo } from '../domain/responsable-operativo.entity';
import { cargarOperativo, eventoOperativo, type UsuarioOperativo } from './operativo-helpers';

export interface AsignarResponsablesInput {
  readonly operativoId: string;
  readonly responsables: ReadonlyArray<{ usuarioId: string; funcion?: string }>;
  readonly usuario: UsuarioOperativo;
}

/**
 * RF-4 "asignar responsables ... a un operativo de captura". Los responsables
 * son usuarios ACTIVOS del sistema. Reasignar a alguien ya asignado actualiza su
 * funcion en vez de duplicarlo.
 */
@Injectable()
export class AsignarResponsablesUseCase implements UseCase<AsignarResponsablesInput, Operativo> {
  constructor(
    @Inject(OPERATIVO_REPOSITORY) private readonly operativos: OperativoRepositoryPort,
    @Inject(REFERENCIAS_OPERATIVO) private readonly referencias: ReferenciasOperativoPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: AsignarResponsablesInput): Promise<Operativo> {
    const operativo = await cargarOperativo(this.operativos, input.operativoId, input.usuario);
    operativo.asegurarEditable();

    const pedidos = [...new Set(input.responsables.map((r) => r.usuarioId))];
    const activos = await this.referencias.usuariosActivos(pedidos);
    const faltante = pedidos.find((id) => !activos.includes(id));
    if (faltante) {
      throw new NotFoundError('usuario activo', faltante);
    }

    const actuales = operativo.responsables ?? [];
    const cambiados = input.responsables.map((pedido) => {
      const responsable =
        actuales.find((r) => r.usuarioId === pedido.usuarioId) ?? new ResponsableOperativo();
      if (!responsable.id) {
        responsable.id = randomUUID();
        responsable.operativoId = operativo.id;
        responsable.usuarioId = pedido.usuarioId;
      }
      responsable.funcion = pedido.funcion?.trim() || responsable.funcion || 'RESPONSABLE';
      return responsable;
    });

    await this.operativos.guardarResponsables(cambiados);
    operativo.responsables = [
      ...actuales.filter((r) => !cambiados.some((c) => c.id === r.id)),
      ...cambiados,
    ];

    this.eventos.emit(
      EVENTOS.OPERATIVO_ACTUALIZADO,
      eventoOperativo(operativo, 'RESPONSABLES', input.usuario.id),
    );
    return operativo;
  }
}
