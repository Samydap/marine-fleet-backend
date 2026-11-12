import { Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import type { MotivoGeneracion } from '../domain/cartel.entity';
import { requiereNuevaVersion } from '../domain/politica-versionado';
import { GenerarCartelUseCase, type ResultadoGeneracion } from './generar-cartel.use-case';

export interface RegenerarPorCambioInput {
  readonly criminalId: string;
  readonly motivo: MotivoGeneracion;
  readonly usuarioId: string | null;
}

/**
 * RF-2 "actualizar automaticamente el cartel cuando cambie la foto, recompensa,
 * estado o afiliacion". Lo invocan los oyentes de eventos, no un boton.
 *
 * Aplica la politica de versionado: un motivo que no obliga version nueva no
 * genera nada. Y aunque el motivo obligue, si la instantanea no cambio, el caso
 * de uso de generacion reutiliza la version vigente.
 */
@Injectable()
export class RegenerarPorCambioUseCase implements UseCase<
  RegenerarPorCambioInput,
  ResultadoGeneracion | null
> {
  constructor(private readonly generar: GenerarCartelUseCase) {}

  async execute(input: RegenerarPorCambioInput): Promise<ResultadoGeneracion | null> {
    if (!requiereNuevaVersion(input.motivo)) {
      return null;
    }
    return this.generar.execute({ ...input, forzar: false });
  }
}
