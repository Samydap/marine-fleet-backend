import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type {
  CriminalEstadoCambiadoEvent,
  IncidenteCerradoEvent,
} from '../../../shared/domain/events/eventos.contracts';
import {
  CRIMINAL_REPOSITORY,
  type CriminalRepositoryPort,
} from '../domain/criminal.repository.port';
import { EstadoCriminal, puedeTransicionar } from '../domain/estado-criminal.enum';
import { publicarEvento } from './publicar-evento';

const ESTADO_POR_DESENLACE: Readonly<Record<string, EstadoCriminal | undefined>> = {
  CAPTURADO: EstadoCriminal.CAPTURADO,
  MUERTO: EstadoCriminal.MUERTO,
};

/**
 * RF-6 -> RF-1. Cuando se cierra un enfrentamiento, los criminales capturados o
 * muertos cambian de estado aqui. Incidentes no escribe la tabla criminales:
 * publica INCIDENTE_CERRADO y este modulo decide.
 *
 * Es una accion del sistema, por eso no exige `version`. Una transicion no
 * permitida (por ejemplo, un MUERTO que "escapa") se ignora en lugar de fallar
 * todo el cierre del incidente. Devuelve cuantos criminales cambiaron.
 */
@Injectable()
export class AplicarDesenlaceIncidenteUseCase implements UseCase<IncidenteCerradoEvent, number> {
  constructor(
    @Inject(CRIMINAL_REPOSITORY) private readonly repositorio: CriminalRepositoryPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(evento: IncidenteCerradoEvent): Promise<number> {
    let cambiados = 0;

    for (const { criminalId, desenlace } of evento.desenlaces) {
      const nuevoEstado = ESTADO_POR_DESENLACE[desenlace];
      if (!nuevoEstado) continue;

      const criminal = await this.repositorio.buscarPorId(criminalId);
      if (!criminal || !puedeTransicionar(criminal.estado, nuevoEstado)) continue;

      const estadoAnterior = criminal.estado;
      criminal.cambiarEstado(nuevoEstado, evento.usuarioId ?? '');
      criminal.actualizadoPor = evento.usuarioId;
      await this.repositorio.guardar(criminal);
      cambiados += 1;

      const cambio: CriminalEstadoCambiadoEvent = {
        criminalId,
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        usuarioId: evento.usuarioId,
      };
      await publicarEvento(this.eventos, EVENTOS.CRIMINAL_ESTADO_CAMBIADO, cambio);
    }

    return cambiados;
  }
}
