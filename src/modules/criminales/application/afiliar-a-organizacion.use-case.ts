import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { CriminalActualizadoEvent } from '../../../shared/domain/events/eventos.contracts';
import {
  CRIMINAL_REPOSITORY,
  type CriminalRepositoryPort,
} from '../domain/criminal.repository.port';
import { EstadoCriminal, RolMembresia } from '../domain/estado-criminal.enum';
import { Membresia } from '../domain/membresia.entity';
import {
  MEMBRESIA_REPOSITORY,
  type MembresiaRepositoryPort,
} from '../domain/membresia.repository.port';
import {
  ORGANIZACION_REPOSITORY,
  type OrganizacionRepositoryPort,
} from '../domain/organizacion.repository.port';
import { publicarEvento } from './publicar-evento';

export interface AfiliarInput {
  readonly criminalId: string;
  readonly organizacionId: string;
  readonly rol: RolMembresia;
  readonly fechaIngreso?: Date;
  readonly usuarioId: string;
}

/**
 * RF-1 "asociar afiliaciones (tripulacion, organizacion, banda) a cada criminal".
 *
 * Reglas:
 *  - No se duplica una afiliacion vigente a la misma organizacion: si ya existe
 *    y cambia el rol, se cierra la anterior y se abre una nueva (queda historia).
 *  - Una organizacion solo tiene un LIDER vigente.
 *  - No se afilia a una organizacion inactiva ni a un criminal MUERTO.
 */
@Injectable()
export class AfiliarAOrganizacionUseCase implements UseCase<AfiliarInput, Membresia> {
  constructor(
    @Inject(CRIMINAL_REPOSITORY) private readonly criminales: CriminalRepositoryPort,
    @Inject(ORGANIZACION_REPOSITORY) private readonly organizaciones: OrganizacionRepositoryPort,
    @Inject(MEMBRESIA_REPOSITORY) private readonly membresias: MembresiaRepositoryPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: AfiliarInput): Promise<Membresia> {
    const criminal = await this.criminales.buscarPorId(input.criminalId);
    if (!criminal) throw new NotFoundError('criminal', input.criminalId);
    if (criminal.estado === EstadoCriminal.MUERTO) {
      throw new DomainError('No se puede afiliar a un criminal MUERTO.', 'CRIMINAL_CERRADO');
    }

    const organizacion = await this.organizaciones.buscarPorId(input.organizacionId);
    if (!organizacion) throw new NotFoundError('organizacion', input.organizacionId);
    if (!organizacion.activa) {
      throw new DomainError('La organizacion esta inactiva.', 'ORGANIZACION_INACTIVA');
    }

    const actual = await this.membresias.buscarVigente(input.criminalId, input.organizacionId);
    if (actual && actual.rol === input.rol) {
      throw new DomainError(
        'El criminal ya esta afiliado a esa organizacion con ese rol.',
        'AFILIACION_DUPLICADA',
      );
    }

    if (input.rol === RolMembresia.LIDER) {
      const miembros = await this.membresias.listarPorOrganizacion(input.organizacionId, true);
      const lider = miembros.find((m) => m.rol === RolMembresia.LIDER);
      if (lider && lider.criminalId !== input.criminalId) {
        throw new DomainError(
          'La organizacion ya tiene un lider vigente. Desafilialo o cambia su rol primero.',
          'LIDER_EXISTENTE',
          { liderCriminalId: lider.criminalId },
        );
      }
    }

    if (actual) {
      actual.cerrar();
      await this.membresias.guardar(actual);
    }

    const membresia = new Membresia();
    membresia.id = randomUUID();
    membresia.criminalId = input.criminalId;
    membresia.organizacionId = input.organizacionId;
    membresia.rol = input.rol;
    membresia.vigente = true;
    membresia.fechaIngreso = input.fechaIngreso ?? new Date();
    membresia.fechaSalida = null;
    membresia.creadoPor = input.usuarioId;
    const guardada = await this.membresias.guardar(membresia);
    guardada.organizacion = organizacion;

    const evento: CriminalActualizadoEvent = {
      criminalId: input.criminalId,
      usuarioId: input.usuarioId,
      motivos: ['AFILIACION'],
    };
    await publicarEvento(this.eventos, EVENTOS.CRIMINAL_ACTUALIZADO, evento);

    return guardada;
  }
}
