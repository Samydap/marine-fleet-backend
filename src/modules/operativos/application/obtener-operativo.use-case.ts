import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import {
  CRIMINAL_READER,
  type CriminalReaderPort,
  type CriminalResumen,
} from '../../criminales/domain/criminal.repository.port';
import type { Operativo } from '../domain/operativo.entity';
import {
  OPERATIVO_REPOSITORY,
  type OperativoRepositoryPort,
} from '../domain/operativo.repository.port';
import { cargarOperativo, type UsuarioOperativo } from './operativo-helpers';

export interface DetalleOperativo {
  readonly operativo: Operativo;
  readonly criminal: CriminalResumen | null;
  readonly incidentesVinculados: number;
}

/** Detalle de un operativo: bases, responsables, objetivo y enfrentamientos vinculados. */
@Injectable()
export class ObtenerOperativoUseCase implements UseCase<
  { id: string; usuario: UsuarioOperativo },
  DetalleOperativo
> {
  constructor(
    @Inject(OPERATIVO_REPOSITORY) private readonly operativos: OperativoRepositoryPort,
    @Inject(CRIMINAL_READER) private readonly criminales: CriminalReaderPort,
  ) {}

  async execute(input: { id: string; usuario: UsuarioOperativo }): Promise<DetalleOperativo> {
    const operativo = await cargarOperativo(this.operativos, input.id, input.usuario);
    const [criminal, incidentesVinculados] = await Promise.all([
      operativo.objetivoCriminalId
        ? this.criminales.obtenerResumen(operativo.objetivoCriminalId)
        : Promise.resolve(null),
      this.operativos.contarIncidentesVinculados(operativo.id),
    ]);
    return { operativo, criminal, incidentesVinculados };
  }
}
