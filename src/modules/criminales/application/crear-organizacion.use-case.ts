import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import type { CategoriaOrganizacion, TipoAgrupacion } from '../domain/estado-criminal.enum';
import { Organizacion } from '../domain/organizacion.entity';
import {
  ORGANIZACION_REPOSITORY,
  type OrganizacionRepositoryPort,
} from '../domain/organizacion.repository.port';

export interface CrearOrganizacionInput {
  readonly nombre: string;
  readonly tipoAgrupacion: TipoAgrupacion;
  readonly categoria: CategoriaOrganizacion;
  readonly zonaInfluenciaId?: string;
  readonly descripcion?: string;
}

/**
 * RF-1 "registrar y administrar tripulaciones, organizaciones y bandas,
 * indicando su tipo (pirata, revolucionario, criminal independiente)".
 *
 * Una sola tabla con `categoria` cubre las tres entidades del universo: los
 * Piratas, el Ejercito Revolucionario y las organizaciones independientes.
 */
@Injectable()
export class CrearOrganizacionUseCase implements UseCase<CrearOrganizacionInput, Organizacion> {
  constructor(
    @Inject(ORGANIZACION_REPOSITORY) private readonly organizaciones: OrganizacionRepositoryPort,
  ) {}

  async execute(input: CrearOrganizacionInput): Promise<Organizacion> {
    const nombre = input.nombre.trim();
    if (await this.organizaciones.buscarPorNombre(nombre)) {
      throw new DomainError('Ya existe una organizacion con ese nombre.', 'ORGANIZACION_DUPLICADA');
    }

    const organizacion = new Organizacion();
    organizacion.id = randomUUID();
    organizacion.nombre = nombre;
    organizacion.tipoAgrupacion = input.tipoAgrupacion;
    organizacion.categoria = input.categoria;
    organizacion.zonaInfluenciaId = input.zonaInfluenciaId ?? null;
    organizacion.descripcion = input.descripcion ?? null;
    organizacion.activa = true;
    return this.organizaciones.guardar(organizacion);
  }
}
