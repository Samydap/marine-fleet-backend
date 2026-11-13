import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import {
  CRIMINAL_READER,
  type CriminalReaderPort,
} from '../../criminales/domain/criminal.repository.port';
import {
  AVISTAMIENTO_REPOSITORY,
  type AvistamientoRepositoryPort,
} from '../domain/avistamiento.repository.port';
import { parsearFechaHora } from '../domain/fecha-hora';
import { ZONA_CATALOGO, type ZonaCatalogoPort } from '../domain/zona-catalogo.port';
import type {
  AvistamientoConCriminal,
  DatosAvistamientoInput,
} from './registrar-avistamiento.use-case';
import { exigirCriminal, textoOpcional, validarZona } from './validaciones';

export interface ActualizarAvistamientoInput extends DatosAvistamientoInput {
  readonly id: string;
}

/** RF-3. Corrige un avistamiento. Regla: uno VERIFICADO no se edita. */
@Injectable()
export class ActualizarAvistamientoUseCase implements UseCase<
  ActualizarAvistamientoInput,
  AvistamientoConCriminal
> {
  constructor(
    @Inject(AVISTAMIENTO_REPOSITORY) private readonly avistamientos: AvistamientoRepositoryPort,
    @Inject(CRIMINAL_READER) private readonly criminales: CriminalReaderPort,
    @Inject(ZONA_CATALOGO) private readonly zonas: ZonaCatalogoPort,
  ) {}

  async execute(input: ActualizarAvistamientoInput): Promise<AvistamientoConCriminal> {
    const avistamiento = await this.avistamientos.buscarPorId(input.id);
    if (!avistamiento) {
      throw new NotFoundError('avistamiento', input.id);
    }
    avistamiento.asegurarModificable();

    const criminal = await exigirCriminal(this.criminales, input.criminalId);
    await validarZona(this.zonas, input.zonaInfluenciaId);

    avistamiento.criminalId = criminal.id;
    avistamiento.criminal = undefined;
    avistamiento.fechaHora = parsearFechaHora(input.fechaHora);
    avistamiento.ubicacion = input.ubicacion.trim();
    avistamiento.testigo = textoOpcional(input.testigo);
    avistamiento.zonaInfluenciaId = input.zonaInfluenciaId ?? null;
    avistamiento.observaciones = textoOpcional(input.observaciones);

    return {
      avistamiento: await this.avistamientos.guardar(avistamiento),
      criminalNombre: criminal.nombre,
    };
  }
}
