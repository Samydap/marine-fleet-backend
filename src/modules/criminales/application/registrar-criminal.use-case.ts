import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { CriminalRegistradoEvent } from '../../../shared/domain/events/eventos.contracts';
import { Criminal } from '../domain/criminal.entity';
import {
  CRIMINAL_REPOSITORY,
  type CriminalRepositoryPort,
} from '../domain/criminal.repository.port';
import { EstadoCriminal, NivelAmenaza, RolMembresia } from '../domain/estado-criminal.enum';
import { Membresia } from '../domain/membresia.entity';
import {
  MEMBRESIA_REPOSITORY,
  type MembresiaRepositoryPort,
} from '../domain/membresia.repository.port';
import {
  ORGANIZACION_REPOSITORY,
  type OrganizacionRepositoryPort,
} from '../domain/organizacion.repository.port';
import { normalizarNombre } from '../domain/services/normalizador-nombre';
import { publicarEvento } from './publicar-evento';

export interface RegistrarCriminalInput {
  readonly nombre: string;
  readonly alias?: string[];
  readonly edad?: number;
  readonly descripcionFisica?: string;
  readonly zonaInfluenciaId?: string;
  readonly organizacionId?: string;
  readonly rolEnOrganizacion?: RolMembresia;
  readonly usuarioId: string;
  readonly baseNavalId: string | null;
}

/**
 * RF-1. CASO DE USO DE REFERENCIA: esta es la forma que debe tener todo caso de
 * uso del proyecto. Un archivo, una clase, un metodo `execute`.
 *
 * Observa que:
 *  - Depende de PUERTOS, no de TypeORM.
 *  - No conoce HTTP: no devuelve codigos de estado, lanza errores de dominio.
 *  - El nivel de amenaza queda PENDIENTE: lo calcula el modulo `amenaza` al
 *    escuchar el evento. Este modulo no sabe como se clasifica el riesgo.
 *  - El cartel (RF-2) tampoco lo genera este modulo: Carteles escucha el evento.
 */
@Injectable()
export class RegistrarCriminalUseCase implements UseCase<RegistrarCriminalInput, Criminal> {
  constructor(
    @Inject(CRIMINAL_REPOSITORY) private readonly repositorio: CriminalRepositoryPort,
    @Inject(ORGANIZACION_REPOSITORY) private readonly organizaciones: OrganizacionRepositoryPort,
    @Inject(MEMBRESIA_REPOSITORY) private readonly membresias: MembresiaRepositoryPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: RegistrarCriminalInput): Promise<Criminal> {
    const nombreNormalizado = normalizarNombre(input.nombre);

    const existente = await this.repositorio.buscarPorNombreNormalizado(nombreNormalizado);
    if (existente) {
      throw new DomainError(
        `Ya existe un criminal registrado con ese nombre (id ${existente.id}).`,
        'CRIMINAL_DUPLICADO',
        { idExistente: existente.id },
      );
    }

    // Se valida ANTES de guardar: si la organizacion no existe no debe quedar
    // un criminal a medio registrar.
    if (input.organizacionId && !(await this.organizaciones.buscarPorId(input.organizacionId))) {
      throw new NotFoundError('organizacion', input.organizacionId);
    }

    const criminal = new Criminal();
    criminal.id = randomUUID();
    criminal.nombre = input.nombre.trim();
    criminal.nombreNormalizado = nombreNormalizado;
    criminal.alias = input.alias ?? [];
    criminal.edad = input.edad ?? null;
    criminal.descripcionFisica = input.descripcionFisica ?? null;
    criminal.foto = null;
    criminal.estado = EstadoCriminal.ACTIVO;
    criminal.fechaBaja = null;
    criminal.zonaInfluenciaId = input.zonaInfluenciaId ?? null;
    criminal.recompensaVigenteMonto = null;
    criminal.nivelAmenaza = NivelAmenaza.PENDIENTE;
    criminal.origenBaseId = input.baseNavalId;
    criminal.creadoPor = input.usuarioId;
    criminal.actualizadoPor = input.usuarioId;

    const guardado = await this.repositorio.guardar(criminal);

    if (input.organizacionId) {
      const membresia = new Membresia();
      membresia.id = randomUUID();
      membresia.criminalId = guardado.id;
      membresia.organizacionId = input.organizacionId;
      membresia.rol = input.rolEnOrganizacion ?? RolMembresia.MIEMBRO;
      membresia.vigente = true;
      membresia.fechaIngreso = new Date();
      membresia.fechaSalida = null;
      membresia.creadoPor = input.usuarioId;
      await this.membresias.guardar(membresia);
    }

    const evento: CriminalRegistradoEvent = { criminalId: guardado.id, usuarioId: input.usuarioId };
    await publicarEvento(this.eventos, EVENTOS.CRIMINAL_REGISTRADO, evento);

    // Se relee para devolver membresias y el nivel que Amenaza pudo haber fijado.
    return (await this.repositorio.buscarPorId(guardado.id)) ?? guardado;
  }
}
