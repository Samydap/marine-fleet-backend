import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { RecompensaSolicitadaEvent } from '../../../shared/domain/events/eventos.contracts';
import { Bounty } from '../../../shared/domain/value-objects/bounty.vo';
import {
  CRIMINAL_READER,
  type CriminalReaderPort,
} from '../../criminales/domain/criminal.repository.port';
import { EstadoCriminal } from '../../criminales/domain/estado-criminal.enum';
import { EstadoRecompensa } from '../domain/estado-recompensa.enum';
import { requiereValidacionDeAlmirante } from '../domain/politica-validacion';
import { Recompensa } from '../domain/recompensa.entity';
import {
  RECOMPENSA_REPOSITORY,
  type RecompensaRepositoryPort,
} from '../domain/recompensa.repository.port';
import { ActivarRecompensaService } from './activar-recompensa.service';
import { publicarEvento } from './publicar-evento';

export interface SolicitarRecompensaInput {
  readonly criminalId: string;
  readonly monto: number;
  readonly moneda?: string;
  readonly motivo?: string;
  readonly usuarioId: string;
  readonly permisos: readonly string[];
}

/**
 * RF-1 "registrar y actualizar el monto de la recompensa" + "solicitar y validar
 * recompensas de alto rango por parte del Almirante o del Gobierno Mundial".
 *
 * Reglas (politica-validacion.ts):
 *  - Monto < 1.000.000.000: queda VIGENTE de inmediato.
 *  - Monto >= 1.000.000.000: queda PENDIENTE_VALIDACION hasta que un Almirante
 *    la firme. Si quien la solicita YA puede validar, se firma en el acto.
 *  - Solo criminales ACTIVOS reciben recompensa nueva, y no puede haber dos
 *    solicitudes pendientes para el mismo criminal.
 */
@Injectable()
export class SolicitarRecompensaUseCase implements UseCase<SolicitarRecompensaInput, Recompensa> {
  constructor(
    @Inject(RECOMPENSA_REPOSITORY) private readonly recompensas: RecompensaRepositoryPort,
    @Inject(CRIMINAL_READER) private readonly criminales: CriminalReaderPort,
    private readonly activador: ActivarRecompensaService,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: SolicitarRecompensaInput): Promise<Recompensa> {
    const bounty = Bounty.crear(input.monto, input.moneda);

    const criminal = await this.criminales.obtenerResumen(input.criminalId);
    if (!criminal) throw new NotFoundError('criminal', input.criminalId);
    if (criminal.estado !== EstadoCriminal.ACTIVO) {
      throw new DomainError(
        `No se emite recompensa para un criminal ${criminal.estado}.`,
        'CRIMINAL_NO_ACTIVO',
      );
    }
    if (await this.recompensas.buscarPendiente(input.criminalId)) {
      throw new DomainError(
        'Ya hay una recompensa pendiente de validacion para este criminal.',
        'RECOMPENSA_PENDIENTE_EXISTENTE',
      );
    }

    const recompensa = new Recompensa();
    recompensa.id = randomUUID();
    recompensa.criminalId = input.criminalId;
    recompensa.monto = bounty.monto;
    recompensa.moneda = bounty.moneda;
    recompensa.estado = EstadoRecompensa.PENDIENTE_VALIDACION;
    recompensa.requiereValidacion = requiereValidacionDeAlmirante(bounty.monto);
    recompensa.solicitadaPor = input.usuarioId;
    recompensa.validadaPor = null;
    recompensa.fechaValidacion = null;
    recompensa.vigenteDesde = null;
    recompensa.vigenteHasta = null;
    recompensa.motivo = input.motivo ?? null;

    // Regla de dos personas: una recompensa de alto rango SIEMPRE queda pendiente,
    // aunque la solicite un Almirante. La valida otra persona con
    // RECOMPENSAS_VALIDAR (validar-recompensa impide aprobar la propia).
    if (!recompensa.requiereValidacion) {
      recompensa.activar(null);
      await this.activador.activar(recompensa, input.usuarioId);
    } else {
      await this.recompensas.guardar(recompensa);
    }

    const evento: RecompensaSolicitadaEvent = {
      recompensaId: recompensa.id,
      criminalId: recompensa.criminalId,
      monto: recompensa.monto,
      requiereValidacion: recompensa.requiereValidacion,
      usuarioId: input.usuarioId,
    };
    await publicarEvento(this.eventos, EVENTOS.RECOMPENSA_SOLICITADA, evento);

    return recompensa;
  }
}
