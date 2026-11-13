import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { AmenazaReclasificadaEvent } from '../../../shared/domain/events/eventos.contracts';
import type { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';
import {
  CRIMINAL_NIVEL_WRITER,
  CRIMINAL_READER,
  type CriminalNivelWriterPort,
  type CriminalReaderPort,
} from '../../criminales/domain/criminal.repository.port';
import { AnalisisRiesgo } from '../domain/analisis-riesgo.entity';
import {
  ANALISIS_RIESGO_REPOSITORY,
  type AnalisisRiesgoRepositoryPort,
} from '../domain/analisis-riesgo.repository.port';
import { CONTEXTO_ZONA_PROVIDER, type ContextoZonaPort } from '../domain/contexto-zona.port';
import {
  CRITERIO_AMENAZA_REPOSITORY,
  type CriterioAmenazaRepositoryPort,
} from '../domain/criterio-amenaza.repository.port';
import { clasificarAmenaza, type ResultadoClasificacion } from '../domain/motor-clasificacion';
import { publicarEvento } from './publicar-evento';

export interface ClasificarCriminalInput {
  readonly criminalId: string;
  /** Null cuando la dispara el sistema (un evento) y no una persona. */
  readonly usuarioId: string | null;
}

export interface ResultadoAnalisis extends ResultadoClasificacion {
  readonly criminalId: string;
  readonly analisisId: string;
  readonly nivelAnterior: NivelAmenaza;
  readonly cambio: boolean;
  readonly montoEvaluado: number | null;
}

/**
 * RF-5 "clasificar automaticamente el nivel de amenaza de un criminal (Bajo,
 * Medio, Alto) basandose en el rango numerico de su recompensa" + "clasificacion
 * automatica segun peligrosidad y zona de influencia".
 *
 * Flujo:
 *  1. Lee el criminal por CRIMINAL_READER (no conoce su tabla).
 *  2. Lee los criterios VIGENTES (configurables, no constantes en el codigo).
 *  3. Pide el peso de la zona (Grand Line / cercania a cuartel general).
 *  4. Aplica el motor puro `clasificarAmenaza`.
 *  5. Persiste el nivel por CRIMINAL_NIVEL_WRITER (Criminales lo guarda).
 *  6. Deja la fila de AnalisisRiesgo y, si cambio, emite AMENAZA_RECLASIFICADA.
 */
@Injectable()
export class ClasificarCriminalUseCase implements UseCase<
  ClasificarCriminalInput,
  ResultadoAnalisis
> {
  constructor(
    @Inject(CRIMINAL_READER) private readonly criminales: CriminalReaderPort,
    @Inject(CRIMINAL_NIVEL_WRITER) private readonly nivelWriter: CriminalNivelWriterPort,
    @Inject(CRITERIO_AMENAZA_REPOSITORY) private readonly criterios: CriterioAmenazaRepositoryPort,
    @Inject(ANALISIS_RIESGO_REPOSITORY) private readonly analisis: AnalisisRiesgoRepositoryPort,
    @Inject(CONTEXTO_ZONA_PROVIDER) private readonly zonas: ContextoZonaPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: ClasificarCriminalInput): Promise<ResultadoAnalisis> {
    const criminal = await this.criminales.obtenerResumen(input.criminalId);
    if (!criminal) throw new NotFoundError('criminal', input.criminalId);

    const vigentes = await this.criterios.listarVigentes();
    const zona = criminal.zonaInfluenciaId
      ? ((await this.zonas.obtener(criminal.zonaInfluenciaId)) ?? undefined)
      : undefined;

    const resultado = clasificarAmenaza(criminal.recompensaVigenteMonto, vigentes, zona);

    const anterior =
      (await this.nivelWriter.actualizarNivelAmenaza(
        criminal.id,
        resultado.nivel,
        input.usuarioId,
      )) ?? criminal.nivelAmenaza;

    const fila = new AnalisisRiesgo();
    fila.id = randomUUID();
    fila.criminalId = criminal.id;
    fila.fechaAnalisis = new Date();
    fila.montoEvaluado = criminal.recompensaVigenteMonto;
    fila.nivelBase = resultado.nivelBase;
    fila.nivelResultante = resultado.nivel;
    fila.escalado = resultado.escalado;
    fila.justificacion = resultado.justificacion;
    fila.ejecutadoPor = input.usuarioId;
    await this.analisis.guardar(fila);

    const cambio = anterior !== resultado.nivel;
    if (cambio) {
      const evento: AmenazaReclasificadaEvent = {
        criminalId: criminal.id,
        nivelAnterior: anterior,
        nivelNuevo: resultado.nivel,
      };
      await publicarEvento(this.eventos, EVENTOS.AMENAZA_RECLASIFICADA, evento);
    }

    return {
      ...resultado,
      criminalId: criminal.id,
      analisisId: fila.id,
      nivelAnterior: anterior,
      cambio,
      montoEvaluado: criminal.recompensaVigenteMonto,
    };
  }
}
