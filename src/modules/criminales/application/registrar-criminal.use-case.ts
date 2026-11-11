import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import { Criminal } from '../domain/criminal.entity';
import {
  CRIMINAL_REPOSITORY,
  type CriminalRepositoryPort,
} from '../domain/criminal.repository.port';
import { EstadoCriminal, NivelAmenaza, RolMembresia } from '../domain/estado-criminal.enum';
import { normalizarNombre } from '../domain/services/normalizador-nombre';

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
 *  - Depende de un PUERTO (`CriminalRepositoryPort`), no de TypeORM.
 *  - No conoce HTTP: no devuelve codigos de estado, lanza errores de dominio.
 *  - El nivel de amenaza queda PENDIENTE: lo calcula el modulo `amenaza` al
 *    escuchar el evento. Este modulo no sabe como se clasifica el riesgo.
 */
@Injectable()
export class RegistrarCriminalUseCase implements UseCase<RegistrarCriminalInput, Criminal> {
  constructor(
    @Inject(CRIMINAL_REPOSITORY) private readonly repositorio: CriminalRepositoryPort,
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

    // Carteles (RF-2) y Amenaza (RF-5) escuchan esto. Este modulo no los conoce.
    this.eventos.emit(EVENTOS.CRIMINAL_REGISTRADO, {
      criminalId: guardado.id,
      usuarioId: input.usuarioId,
      organizacionId: input.organizacionId ?? null,
      rolEnOrganizacion: input.rolEnOrganizacion ?? null,
    });

    return guardado;
  }
}
