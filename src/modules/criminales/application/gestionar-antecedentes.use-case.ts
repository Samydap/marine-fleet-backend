import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { Antecedente } from '../domain/antecedente.entity';
import {
  ANTECEDENTE_REPOSITORY,
  type AntecedenteRepositoryPort,
} from '../domain/antecedente.repository.port';
import {
  CRIMINAL_REPOSITORY,
  type CriminalRepositoryPort,
} from '../domain/criminal.repository.port';

export interface RegistrarAntecedenteInput {
  readonly criminalId: string;
  readonly tipoDelito: string;
  readonly descripcion: string;
  readonly fechaHecho?: Date;
  readonly ubicacion?: string;
  readonly usuarioId: string;
}

/**
 * RF-1 "registrar antecedentes y delitos cometidos por cada criminal".
 * Registrar y listar comparten las mismas dependencias y la misma regla (el
 * criminal debe existir), por eso viven en un solo servicio de aplicacion.
 */
@Injectable()
export class GestionarAntecedentesUseCase {
  constructor(
    @Inject(CRIMINAL_REPOSITORY) private readonly criminales: CriminalRepositoryPort,
    @Inject(ANTECEDENTE_REPOSITORY) private readonly antecedentes: AntecedenteRepositoryPort,
  ) {}

  async registrar(input: RegistrarAntecedenteInput): Promise<Antecedente> {
    await this.asegurarCriminal(input.criminalId);

    const antecedente = new Antecedente();
    antecedente.id = randomUUID();
    antecedente.criminalId = input.criminalId;
    antecedente.tipoDelito = input.tipoDelito.trim();
    antecedente.descripcion = input.descripcion.trim();
    antecedente.fechaHecho = input.fechaHecho ?? null;
    antecedente.ubicacion = input.ubicacion ?? null;
    antecedente.registradoPor = input.usuarioId;
    return this.antecedentes.guardar(antecedente);
  }

  async listar(criminalId: string): Promise<Antecedente[]> {
    await this.asegurarCriminal(criminalId);
    return this.antecedentes.listarPorCriminal(criminalId);
  }

  private async asegurarCriminal(criminalId: string): Promise<void> {
    if (!(await this.criminales.existe(criminalId))) {
      throw new NotFoundError('criminal', criminalId);
    }
  }
}
