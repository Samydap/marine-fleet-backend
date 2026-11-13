import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import {
  CRIMINAL_READER,
  type CriminalReaderPort,
} from '../../criminales/domain/criminal.repository.port';
import {
  OPERATIVO_READER,
  type OperativoReaderPort,
} from '../../operativos/domain/operativo.repository.port';
import { Incidente, type MarinoParticipante } from '../domain/incidente.entity';
import {
  INCIDENTE_REPOSITORY,
  type IncidenteRepositoryPort,
} from '../domain/incidente.repository.port';
import { Participante } from '../domain/participante.entity';
import {
  DesenlaceParticipante,
  ResultadoEnfrentamiento,
  RolEnIncidente,
  TipoIncidente,
} from '../domain/resultado-enfrentamiento.enum';
import {
  asegurarBasePropia,
  baseDelUsuario,
  eventoCierre,
  type UsuarioIncidente,
} from './incidente-helpers';

export interface ParticipanteCriminalInput {
  readonly criminalId: string;
  readonly rolEnIncidente?: RolEnIncidente;
  readonly desenlace?: DesenlaceParticipante;
  readonly observaciones?: string;
}

export interface RegistrarIncidenteInput {
  readonly tipo?: TipoIncidente;
  readonly fechaHora: Date;
  readonly ubicacion: string;
  readonly descripcion: string;
  readonly zonaInfluenciaId?: string;
  readonly baseNavalId?: string;
  readonly operativoId?: string;
  readonly resultado?: ResultadoEnfrentamiento;
  readonly observaciones?: string;
  readonly bajasMarina?: number;
  readonly bajasEnemigas?: number;
  readonly criminales: readonly ParticipanteCriminalInput[];
  readonly marinos?: readonly MarinoParticipante[];
  readonly usuario: UsuarioIncidente;
}

/**
 * RF-6 "registrar enfrentamientos entre marinos y criminales, incluyendo fecha,
 * ubicacion, participantes, criminal involucrado, resultado y observaciones" y
 * "vincular un enfrentamiento ... al operativo del cual se origino".
 *
 * Si se registra con un resultado final (no EN_CURSO), se considera cerrado y se
 * publica INCIDENTE_CERRADO: Criminales reacciona cambiando el estado de los
 * capturados o muertos. Este modulo nunca escribe la tabla `criminales`.
 */
@Injectable()
export class RegistrarIncidenteUseCase implements UseCase<RegistrarIncidenteInput, Incidente> {
  constructor(
    @Inject(INCIDENTE_REPOSITORY) private readonly incidentes: IncidenteRepositoryPort,
    @Inject(CRIMINAL_READER) private readonly criminales: CriminalReaderPort,
    @Inject(OPERATIVO_READER) private readonly operativos: OperativoReaderPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: RegistrarIncidenteInput): Promise<Incidente> {
    const ids = input.criminales.map((c) => c.criminalId);
    const zonaDelPrimero = await this.validarCriminales(ids);

    if (input.operativoId && !(await this.operativos.obtenerResumen(input.operativoId))) {
      throw new NotFoundError('operativo', input.operativoId);
    }

    const baseNavalId = input.baseNavalId ?? baseDelUsuario(input.usuario);
    asegurarBasePropia(input.usuario, baseNavalId);

    const incidente = this.construir(input, baseNavalId, zonaDelPrimero);
    if (input.resultado && input.resultado !== ResultadoEnfrentamiento.EN_CURSO) {
      incidente.cerrar(input.resultado, []);
    }

    const participantes = incidente.participantes ?? [];
    const guardado = await this.incidentes.guardar(incidente);
    await this.incidentes.guardarParticipantes(participantes);
    guardado.participantes = participantes;

    this.eventos.emit(EVENTOS.INCIDENTE_REGISTRADO, {
      incidenteId: guardado.id,
      operativoId: guardado.operativoId,
      baseNavalId: guardado.baseNavalId,
      criminalesIds: ids,
    });
    if (guardado.estaCerrado()) {
      this.eventos.emit(EVENTOS.INCIDENTE_CERRADO, eventoCierre(guardado, input.usuario.id));
    }
    return guardado;
  }

  /** Verifica que no haya repetidos y que todos existan. Devuelve la zona del primero. */
  private async validarCriminales(ids: string[]): Promise<string | null> {
    if (new Set(ids).size !== ids.length) {
      throw new DomainError('Un criminal aparece repetido.', 'PARTICIPANTE_REPETIDO');
    }
    const encontrados = await this.criminales.obtenerResumenes(ids);
    const faltante = ids.find((id) => !encontrados.some((c) => c.id === id));
    if (faltante) throw new NotFoundError('criminal', faltante);
    return encontrados.find((c) => c.id === ids[0])?.zonaInfluenciaId ?? null;
  }

  private construir(
    input: RegistrarIncidenteInput,
    baseNavalId: string | null,
    zonaPorDefecto: string | null,
  ): Incidente {
    const incidente = Object.assign(new Incidente(), {
      id: randomUUID(),
      operativoId: input.operativoId ?? null,
      tipo: input.tipo ?? TipoIncidente.ENFRENTAMIENTO,
      resultado: ResultadoEnfrentamiento.EN_CURSO,
      fechaHora: input.fechaHora,
      ubicacion: input.ubicacion.trim(),
      zonaInfluenciaId: input.zonaInfluenciaId ?? zonaPorDefecto,
      baseNavalId,
      descripcion: input.descripcion.trim(),
      observaciones: input.observaciones ?? null,
      participantesMarina: input.marinos ? [...input.marinos] : [],
      bajasMarina: input.bajasMarina ?? 0,
      bajasEnemigas: input.bajasEnemigas ?? 0,
      registradoPor: input.usuario.id,
    });
    incidente.participantes = input.criminales.map((c) => this.participante(incidente.id, c));
    return incidente;
  }

  private participante(incidenteId: string, c: ParticipanteCriminalInput): Participante {
    const participante = new Participante();
    participante.id = randomUUID();
    participante.incidenteId = incidenteId;
    participante.criminalId = c.criminalId;
    participante.rolEnIncidente = c.rolEnIncidente ?? RolEnIncidente.OBJETIVO;
    participante.desenlace = c.desenlace ?? DesenlaceParticipante.DESCONOCIDO;
    participante.observaciones = c.observaciones ?? null;
    return participante;
  }
}
