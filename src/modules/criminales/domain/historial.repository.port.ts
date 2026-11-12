import type { PageResult } from '../../../shared/application/pagination/page-result';

export const HISTORIAL_CRIMINAL_REPOSITORY = Symbol('HISTORIAL_CRIMINAL_REPOSITORY');

/**
 * Una fila de `criminales_historial`. La tabla la escriben TRIGGERS de la base
 * (InitSchema y AmpliarModelo), no la aplicacion: por eso este puerto es solo de
 * lectura. Ni siquiera un UPDATE manual en phpMyAdmin escapa al registro.
 */
export interface EntradaHistorial {
  readonly id: number;
  readonly criminalId: string;
  readonly campo: string;
  readonly valorAnterior: string | null;
  readonly valorNuevo: string | null;
  readonly usuarioId: string | null;
  readonly usuarioNombre: string | null;
  readonly fecha: Date;
}

export interface FiltroHistorial {
  readonly criminalId: string;
  readonly campo?: string;
  readonly page: number;
  readonly limit: number;
}

export interface HistorialCriminalRepositoryPort {
  listar(filtro: FiltroHistorial): Promise<PageResult<EntradaHistorial>>;
}
