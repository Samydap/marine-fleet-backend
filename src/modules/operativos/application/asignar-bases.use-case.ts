import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import { RolParticipacion } from '../domain/estado-operativo.enum';
import type { Operativo } from '../domain/operativo.entity';
import {
  OPERATIVO_REPOSITORY,
  REFERENCIAS_OPERATIVO,
  type OperativoRepositoryPort,
  type ReferenciasOperativoPort,
} from '../domain/operativo.repository.port';
import { ParticipacionBase } from '../domain/participacion-base.entity';
import { cargarOperativo, eventoOperativo, type UsuarioOperativo } from './operativo-helpers';

export interface BaseAsignada {
  readonly baseNavalId: string;
  readonly rolParticipacion: RolParticipacion;
  readonly unidadesAsignadas?: number;
  readonly recursos?: string;
  readonly observaciones?: string;
}

export interface AsignarBasesInput {
  readonly operativoId: string;
  readonly bases: readonly BaseAsignada[];
  readonly usuario: UsuarioOperativo;
}

/**
 * RF-4 "asignar una o varias bases navales a un operativo" y "asignar ...
 * recursos navales". Si la base ya participa, se actualiza su rol, unidades y
 * recursos (idempotente). La base lider no se reasigna por aqui: su rol LIDER
 * es fijo, aunque si se le pueden actualizar unidades y recursos.
 */
@Injectable()
export class AsignarBasesUseCase implements UseCase<AsignarBasesInput, Operativo> {
  constructor(
    @Inject(OPERATIVO_REPOSITORY) private readonly operativos: OperativoRepositoryPort,
    @Inject(REFERENCIAS_OPERATIVO) private readonly referencias: ReferenciasOperativoPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: AsignarBasesInput): Promise<Operativo> {
    const operativo = await cargarOperativo(this.operativos, input.operativoId, input.usuario);
    operativo.asegurarEditable();

    const ids = [...new Set(input.bases.map((b) => b.baseNavalId))];
    if (ids.length !== input.bases.length) {
      throw new DomainError('Una base aparece repetida en la asignacion.', 'BASE_REPETIDA');
    }

    const existentes = await this.referencias.obtenerBases(ids);
    for (const id of ids) {
      const base = existentes.find((b) => b.id === id);
      if (!base) throw new NotFoundError('base naval', id);
      if (!base.activa) {
        throw new DomainError(`La base ${id} esta inactiva.`, 'BASE_INACTIVA');
      }
    }

    const actuales = operativo.bases ?? [];
    const cambiadas = input.bases.map((asignada) => this.aplicar(operativo, actuales, asignada));
    await this.operativos.guardarParticipaciones(cambiadas);

    operativo.bases = [
      ...actuales.filter((p) => !cambiadas.some((c) => c.id === p.id)),
      ...cambiadas,
    ];

    this.eventos.emit(
      EVENTOS.OPERATIVO_ACTUALIZADO,
      eventoOperativo(operativo, 'BASES', input.usuario.id),
    );
    return operativo;
  }

  private aplicar(
    operativo: Operativo,
    actuales: ParticipacionBase[],
    asignada: BaseAsignada,
  ): ParticipacionBase {
    const esLider = asignada.baseNavalId === operativo.baseLiderId;
    if (asignada.rolParticipacion === RolParticipacion.LIDER && !esLider) {
      throw new DomainError(
        'Solo la base lider tiene el rol LIDER; asigna APOYO, LOGISTICA o BLOQUEO.',
        'ROL_LIDER_RESERVADO',
      );
    }

    const participacion =
      actuales.find((p) => p.baseNavalId === asignada.baseNavalId) ?? new ParticipacionBase();
    if (!participacion.id) {
      participacion.id = randomUUID();
      participacion.operativoId = operativo.id;
      participacion.baseNavalId = asignada.baseNavalId;
      participacion.confirmada = false;
      participacion.observaciones = null;
      participacion.recursos = null;
      participacion.unidadesAsignadas = 0;
    }

    participacion.rolParticipacion = esLider ? RolParticipacion.LIDER : asignada.rolParticipacion;
    participacion.unidadesAsignadas = asignada.unidadesAsignadas ?? participacion.unidadesAsignadas;
    participacion.recursos = asignada.recursos ?? participacion.recursos;
    participacion.observaciones = asignada.observaciones ?? participacion.observaciones;
    return participacion;
  }
}
