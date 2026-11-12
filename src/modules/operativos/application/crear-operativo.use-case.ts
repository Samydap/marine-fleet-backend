import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import {
  CRIMINAL_READER,
  type CriminalReaderPort,
  type CriminalResumen,
} from '../../criminales/domain/criminal.repository.port';
import { EstadoCriminal } from '../../criminales/domain/estado-criminal.enum';
import {
  EstadoOperativo,
  PrioridadOperativo,
  RolParticipacion,
} from '../domain/estado-operativo.enum';
import { Operativo } from '../domain/operativo.entity';
import {
  OPERATIVO_REPOSITORY,
  REFERENCIAS_OPERATIVO,
  type OperativoRepositoryPort,
  type ReferenciasOperativoPort,
} from '../domain/operativo.repository.port';
import { ParticipacionBase } from '../domain/participacion-base.entity';
import { generarCodigoOperativo, sugerirBaseLider } from '../domain/politica-asignacion';
import { eventoOperativo } from './operativo-helpers';

export interface CrearOperativoInput {
  readonly nombre: string;
  readonly objetivoCriminalId: string;
  readonly objetivo?: string;
  readonly descripcion?: string;
  readonly prioridad?: PrioridadOperativo;
  readonly fechaInicioPlaneada: Date;
  readonly zonaInfluenciaId?: string;
  readonly baseLiderId?: string;
  readonly unidadesLider?: number;
  readonly recursosLider?: string;
  readonly usuarioId: string;
  /** Base del usuario (null = rol global). Un usuario de base solo lidera desde su base. */
  readonly alcanceBaseId: string | null;
}

/**
 * RF-4 "crear un operativo de captura contra un criminal especifico, indicando
 * fecha de inicio, objetivo y prioridad".
 *
 * - El criminal debe existir y seguir ACTIVO (no se persigue a un capturado).
 * - La zona, si no se indica, es la zona de influencia del criminal.
 * - La base lider, si no se indica, la sugiere la politica de asignacion.
 * - La base lider queda registrada como participacion LIDER.
 * - Un usuario con base asignada lidera desde su propia base.
 */
@Injectable()
export class CrearOperativoUseCase implements UseCase<CrearOperativoInput, Operativo> {
  constructor(
    @Inject(OPERATIVO_REPOSITORY) private readonly operativos: OperativoRepositoryPort,
    @Inject(REFERENCIAS_OPERATIVO) private readonly referencias: ReferenciasOperativoPort,
    @Inject(CRIMINAL_READER) private readonly criminales: CriminalReaderPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: CrearOperativoInput): Promise<Operativo> {
    const criminal = await this.validarObjetivo(input.objetivoCriminalId);
    const zonaId = await this.resolverZona(input.zonaInfluenciaId ?? criminal.zonaInfluenciaId);

    if (input.alcanceBaseId && input.baseLiderId && input.baseLiderId !== input.alcanceBaseId) {
      throw new ForbiddenError('crear operativos liderados por otra base naval');
    }
    const baseLiderId = await this.resolverBaseLider(
      input.baseLiderId ?? input.alcanceBaseId ?? undefined,
      [criminal.zonaInfluenciaId, zonaId],
    );

    const anio = new Date().getFullYear();
    const codigo = generarCodigoOperativo(anio, (await this.operativos.contarDelAnio(anio)) + 1);
    const guardado = await this.operativos.guardar(
      this.construir(input, codigo, criminal.id, zonaId, baseLiderId),
    );

    const lider = this.participacionLider(guardado.id, baseLiderId, input);
    await this.operativos.guardarParticipaciones([lider]);
    guardado.bases = [lider];
    guardado.responsables = [];

    this.eventos.emit(
      EVENTOS.OPERATIVO_ACTUALIZADO,
      eventoOperativo(guardado, 'CREADO', input.usuarioId),
    );
    return guardado;
  }

  private async validarObjetivo(criminalId: string): Promise<CriminalResumen> {
    const criminal = await this.criminales.obtenerResumen(criminalId);
    if (!criminal) {
      throw new NotFoundError('criminal', criminalId);
    }
    if (criminal.estado !== EstadoCriminal.ACTIVO) {
      throw new DomainError(
        `${criminal.nombre} esta ${criminal.estado}: no se planean capturas sobre el.`,
        'CRIMINAL_NO_BUSCADO',
      );
    }
    return criminal;
  }

  private async resolverZona(zonaId: string | null): Promise<string> {
    if (!zonaId) {
      throw new DomainError('Indica la zona de influencia del operativo.', 'ZONA_REQUERIDA');
    }
    if (!(await this.referencias.zonaExiste(zonaId))) {
      throw new NotFoundError('zona de influencia', zonaId);
    }
    return zonaId;
  }

  private construir(
    input: CrearOperativoInput,
    codigo: string,
    criminalId: string,
    zonaId: string,
    baseLiderId: string,
  ): Operativo {
    return Object.assign(new Operativo(), {
      id: randomUUID(),
      codigo,
      nombre: input.nombre.trim(),
      objetivoCriminalId: criminalId,
      objetivo: input.objetivo ?? null,
      descripcion: input.descripcion ?? null,
      zonaInfluenciaId: zonaId,
      baseLiderId,
      estado: EstadoOperativo.PLANIFICADO,
      prioridad: input.prioridad ?? PrioridadOperativo.MEDIA,
      fechaInicioPlaneada: input.fechaInicioPlaneada,
      fechaInicioReal: null,
      fechaCierre: null,
      resultadoFinal: null,
      observacionesCierre: null,
      creadoPor: input.usuarioId,
    });
  }

  private participacionLider(
    operativoId: string,
    baseLiderId: string,
    input: CrearOperativoInput,
  ): ParticipacionBase {
    return Object.assign(new ParticipacionBase(), {
      id: randomUUID(),
      operativoId,
      baseNavalId: baseLiderId,
      rolParticipacion: RolParticipacion.LIDER,
      unidadesAsignadas: input.unidadesLider ?? 0,
      recursos: input.recursosLider ?? null,
      confirmada: true,
      observaciones: null,
    });
  }

  private async resolverBaseLider(
    baseIndicada: string | undefined,
    zonas: (string | null)[],
  ): Promise<string> {
    if (baseIndicada) {
      const [base] = await this.referencias.obtenerBases([baseIndicada]);
      if (!base) throw new NotFoundError('base naval', baseIndicada);
      if (!base.activa) {
        throw new DomainError('La base lider esta inactiva.', 'BASE_INACTIVA');
      }
      return base.id;
    }
    return sugerirBaseLider(zonas, await this.referencias.listarBasesActivas());
  }
}
