import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { CriminalActualizadoEvent } from '../../../shared/domain/events/eventos.contracts';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import type { CategoriaOrganizacion, TipoAgrupacion } from '../domain/estado-criminal.enum';
import type { Organizacion } from '../domain/organizacion.entity';
import {
  ORGANIZACION_REPOSITORY,
  type OrganizacionRepositoryPort,
} from '../domain/organizacion.repository.port';
import {
  MEMBRESIA_REPOSITORY,
  type MembresiaRepositoryPort,
} from '../domain/membresia.repository.port';
import { publicarEvento } from './publicar-evento';

export interface ActualizarOrganizacionInput {
  readonly organizacionId: string;
  readonly nombre?: string;
  readonly tipoAgrupacion?: TipoAgrupacion;
  readonly categoria?: CategoriaOrganizacion;
  readonly zonaInfluenciaId?: string | null;
  readonly descripcion?: string | null;
  /** false = disolver la organizacion (baja logica, no se borra). */
  readonly activa?: boolean;
  readonly usuarioId?: string | null;
}

/**
 * RF-1. Edita o da de baja logica una organizacion.
 *
 * El nombre y la categoria de la organizacion se imprimen en el cartel de cada
 * miembro: si cambian, se avisa CRIMINAL_ACTUALIZADO(AFILIACION) por cada
 * miembro vigente para que Carteles emita la version corregida.
 */
@Injectable()
export class ActualizarOrganizacionUseCase implements UseCase<
  ActualizarOrganizacionInput,
  Organizacion
> {
  constructor(
    @Inject(ORGANIZACION_REPOSITORY) private readonly organizaciones: OrganizacionRepositoryPort,
    @Inject(MEMBRESIA_REPOSITORY) private readonly membresias: MembresiaRepositoryPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: ActualizarOrganizacionInput): Promise<Organizacion> {
    const organizacion = await this.organizaciones.buscarPorId(input.organizacionId);
    if (!organizacion) throw new NotFoundError('organizacion', input.organizacionId);
    const antes = { nombre: organizacion.nombre, categoria: organizacion.categoria };

    if (input.nombre !== undefined && input.nombre.trim() !== organizacion.nombre) {
      const otra = await this.organizaciones.buscarPorNombre(input.nombre.trim());
      if (otra && otra.id !== organizacion.id) {
        throw new DomainError(
          'Ya existe una organizacion con ese nombre.',
          'ORGANIZACION_DUPLICADA',
        );
      }
      organizacion.nombre = input.nombre.trim();
    }
    this.aplicarCambios(organizacion, input);

    const guardada = await this.organizaciones.guardar(organizacion);

    if (antes.nombre !== guardada.nombre || antes.categoria !== guardada.categoria) {
      await this.avisarMiembros(guardada.id, input.usuarioId ?? null);
    }
    return guardada;
  }

  private aplicarCambios(organizacion: Organizacion, input: ActualizarOrganizacionInput): void {
    if (input.tipoAgrupacion !== undefined) organizacion.tipoAgrupacion = input.tipoAgrupacion;
    if (input.categoria !== undefined) organizacion.categoria = input.categoria;
    if (input.zonaInfluenciaId !== undefined)
      organizacion.zonaInfluenciaId = input.zonaInfluenciaId;
    if (input.descripcion !== undefined) organizacion.descripcion = input.descripcion;
    if (input.activa !== undefined) organizacion.activa = input.activa;
  }

  private async avisarMiembros(organizacionId: string, usuarioId: string | null): Promise<void> {
    const miembros = await this.membresias.listarPorOrganizacion(organizacionId, true);
    for (const miembro of miembros) {
      const evento: CriminalActualizadoEvent = {
        criminalId: miembro.criminalId,
        usuarioId,
        motivos: ['AFILIACION'],
      };
      await publicarEvento(this.eventos, EVENTOS.CRIMINAL_ACTUALIZADO, evento);
    }
  }
}
