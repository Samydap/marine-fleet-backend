import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import type { Incidente, MarinoParticipante } from '../domain/incidente.entity';
import {
  INCIDENTE_REPOSITORY,
  type IncidenteRepositoryPort,
} from '../domain/incidente.repository.port';
import type { TipoIncidente } from '../domain/resultado-enfrentamiento.enum';
import { cargarIncidente, type UsuarioIncidente } from './incidente-helpers';

export interface CorreccionIncidente {
  readonly tipo?: TipoIncidente;
  readonly fechaHora?: Date;
  readonly ubicacion?: string;
  readonly descripcion?: string;
  readonly zonaInfluenciaId?: string;
  readonly observaciones?: string;
  readonly bajasMarina?: number;
  readonly bajasEnemigas?: number;
  readonly marinos?: readonly MarinoParticipante[];
}

export interface CorregirIncidenteInput {
  readonly incidenteId: string;
  readonly version: number;
  readonly cambios: CorreccionIncidente;
  readonly usuario: UsuarioIncidente;
}

/**
 * Corrige los datos descriptivos de un enfrentamiento (clase Enfrentamiento,
 * metodo corregirRegistro). El resultado y los desenlaces NO se corrigen aqui:
 * ya dispararon cambios de estado en otros modulos, asi que se cambian solo por
 * el cierre. La concurrencia optimista evita pisar la correccion de otro marino.
 */
@Injectable()
export class CorregirIncidenteUseCase implements UseCase<CorregirIncidenteInput, Incidente> {
  constructor(@Inject(INCIDENTE_REPOSITORY) private readonly incidentes: IncidenteRepositoryPort) {}

  async execute(input: CorregirIncidenteInput): Promise<Incidente> {
    const incidente = await cargarIncidente(
      this.incidentes,
      input.incidenteId,
      input.usuario,
      input.version,
    );
    const c = input.cambios;

    if (c.tipo !== undefined) incidente.tipo = c.tipo;
    if (c.fechaHora !== undefined) incidente.fechaHora = c.fechaHora;
    if (c.ubicacion !== undefined) incidente.ubicacion = c.ubicacion.trim();
    if (c.descripcion !== undefined) incidente.descripcion = c.descripcion.trim();
    if (c.zonaInfluenciaId !== undefined) incidente.zonaInfluenciaId = c.zonaInfluenciaId;
    if (c.observaciones !== undefined) incidente.observaciones = c.observaciones;
    if (c.bajasMarina !== undefined) incidente.bajasMarina = c.bajasMarina;
    if (c.bajasEnemigas !== undefined) incidente.bajasEnemigas = c.bajasEnemigas;
    if (c.marinos !== undefined) incidente.participantesMarina = [...c.marinos];

    const participantes = incidente.participantes;
    const guardado = await this.incidentes.guardar(incidente);
    guardado.participantes = participantes;
    return guardado;
  }
}
