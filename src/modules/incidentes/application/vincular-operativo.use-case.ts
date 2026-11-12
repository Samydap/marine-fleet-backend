import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import {
  OPERATIVO_READER,
  type OperativoReaderPort,
} from '../../operativos/domain/operativo.repository.port';
import type { Incidente } from '../domain/incidente.entity';
import {
  INCIDENTE_REPOSITORY,
  type IncidenteRepositoryPort,
} from '../domain/incidente.repository.port';
import { cargarIncidente, type UsuarioIncidente } from './incidente-helpers';

export interface VincularOperativoInput {
  readonly incidenteId: string;
  readonly operativoId: string;
  readonly version: number;
  readonly usuario: UsuarioIncidente;
}

/**
 * RF-6 "vincular un enfrentamiento registrado (Historial de Incidentes) al
 * operativo del cual se origino, cuando aplique". El operativo se valida por el
 * puerto de solo lectura que exporta el modulo Operativos.
 */
@Injectable()
export class VincularOperativoUseCase implements UseCase<VincularOperativoInput, Incidente> {
  constructor(
    @Inject(INCIDENTE_REPOSITORY) private readonly incidentes: IncidenteRepositoryPort,
    @Inject(OPERATIVO_READER) private readonly operativos: OperativoReaderPort,
  ) {}

  async execute(input: VincularOperativoInput): Promise<Incidente> {
    const incidente = await cargarIncidente(
      this.incidentes,
      input.incidenteId,
      input.usuario,
      input.version,
    );
    if (!(await this.operativos.obtenerResumen(input.operativoId))) {
      throw new NotFoundError('operativo', input.operativoId);
    }

    incidente.operativoId = input.operativoId;
    const participantes = incidente.participantes;
    const guardado = await this.incidentes.guardar(incidente);
    guardado.participantes = participantes;
    return guardado;
  }
}
