import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { Incidente } from '../domain/incidente.entity';
import {
  INCIDENTE_REPOSITORY,
  type IncidenteRepositoryPort,
} from '../domain/incidente.repository.port';
import type {
  DesenlaceParticipante,
  ResultadoEnfrentamiento,
} from '../domain/resultado-enfrentamiento.enum';
import { cargarIncidente, eventoCierre, type UsuarioIncidente } from './incidente-helpers';

export interface CerrarIncidenteInput {
  readonly incidenteId: string;
  readonly resultado: ResultadoEnfrentamiento;
  readonly desenlaces: ReadonlyArray<{ criminalId: string; desenlace: DesenlaceParticipante }>;
  readonly observaciones?: string;
  readonly version: number;
  readonly usuario: UsuarioIncidente;
}

/**
 * RF-6 "registro de enfrentamientos y resultados": fija el resultado final y el
 * desenlace de cada criminal (CAPTURADO, ESCAPO, MUERTO...).
 *
 * Publica INCIDENTE_CERRADO. El modulo Criminales lo escucha y pasa a CAPTURADO o
 * MUERTO a quien corresponda, lo que a su vez regenera el cartel (RF-2). Asi cada
 * modulo escribe solo sus tablas.
 */
@Injectable()
export class CerrarIncidenteUseCase implements UseCase<CerrarIncidenteInput, Incidente> {
  constructor(
    @Inject(INCIDENTE_REPOSITORY) private readonly incidentes: IncidenteRepositoryPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: CerrarIncidenteInput): Promise<Incidente> {
    const incidente = await cargarIncidente(
      this.incidentes,
      input.incidenteId,
      input.usuario,
      input.version,
    );

    incidente.cerrar(input.resultado, input.desenlaces);
    if (input.observaciones) incidente.observaciones = input.observaciones;

    const participantes = incidente.participantes ?? [];
    const guardado = await this.incidentes.guardar(incidente);
    await this.incidentes.guardarParticipantes(participantes);
    guardado.participantes = participantes;

    this.eventos.emit(EVENTOS.INCIDENTE_CERRADO, eventoCierre(guardado, input.usuario.id));
    return guardado;
  }
}
