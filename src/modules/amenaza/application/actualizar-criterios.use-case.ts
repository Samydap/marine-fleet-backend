import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { CriteriosAmenazaActualizadosEvent } from '../../../shared/domain/events/eventos.contracts';
import type { CriterioAmenaza } from '../domain/criterio-amenaza.entity';
import {
  CRITERIO_AMENAZA_REPOSITORY,
  type CriterioAmenazaRepositoryPort,
} from '../domain/criterio-amenaza.repository.port';
import type { CriterioVigente } from '../domain/motor-clasificacion';
import { validarCriterios } from '../domain/validador-criterios';
import { publicarEvento } from './publicar-evento';
import {
  ReclasificarMasivoUseCase,
  type ResumenReclasificacion,
} from './reclasificar-masivo.use-case';

export interface ActualizarCriteriosInput {
  readonly criterios: readonly CriterioVigente[];
  readonly motivo: string;
  readonly usuarioId: string;
}

export interface ResultadoActualizacionCriterios {
  readonly criterios: CriterioAmenaza[];
  readonly reclasificacion: ResumenReclasificacion;
}

/**
 * RF-5 + RNF "unicamente el perfil de Analista de Datos puede modificar los
 * criterios de clasificacion de amenaza basados en las recompensas".
 *
 * La restriccion de rol la aplica el controller (@Roles + @RequierePermisos).
 * Aqui va la regla de negocio: criterios validos, versionados (los anteriores
 * no se borran, quedan con vigente_hasta) y reclasificacion de todos.
 */
@Injectable()
export class ActualizarCriteriosUseCase implements UseCase<
  ActualizarCriteriosInput,
  ResultadoActualizacionCriterios
> {
  constructor(
    @Inject(CRITERIO_AMENAZA_REPOSITORY) private readonly criterios: CriterioAmenazaRepositoryPort,
    private readonly reclasificar: ReclasificarMasivoUseCase,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: ActualizarCriteriosInput): Promise<ResultadoActualizacionCriterios> {
    const validos = validarCriterios(input.criterios);
    const guardados = await this.criterios.reemplazarVigentes(
      validos,
      input.usuarioId,
      input.motivo,
    );

    const evento: CriteriosAmenazaActualizadosEvent = { usuarioId: input.usuarioId };
    await publicarEvento(this.eventos, EVENTOS.CRITERIOS_AMENAZA_ACTUALIZADOS, evento);

    const reclasificacion = await this.reclasificar.execute(input.usuarioId);
    return { criterios: guardados, reclasificacion };
  }
}
