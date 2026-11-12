import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { EstadoOperativo, PrioridadOperativo } from './estado-operativo.enum';
import type { Operativo } from './operativo.entity';
import type { ParticipacionBase } from './participacion-base.entity';
import type { ResponsableOperativo } from './responsable-operativo.entity';
import type { BaseCandidata } from './politica-asignacion';

export const OPERATIVO_REPOSITORY = Symbol('OPERATIVO_REPOSITORY');

export interface FiltroOperativos {
  readonly q?: string;
  readonly estado?: EstadoOperativo;
  readonly prioridad?: PrioridadOperativo;
  readonly baseNavalId?: string;
  readonly criminalId?: string;
  /** Si viene, solo operativos donde esta base participa (alcance del usuario). */
  readonly alcanceBaseId?: string | null;
  readonly page: number;
  readonly limit: number;
  readonly order: 'ASC' | 'DESC';
}

/** Puerto de persistencia del agregado Operativo (con sus bases y responsables). */
export interface OperativoRepositoryPort {
  /** Carga el operativo con `bases` y `responsables`. */
  buscarPorId(id: string): Promise<Operativo | null>;
  listar(filtro: FiltroOperativos): Promise<PageResult<Operativo>>;
  guardar(operativo: Operativo): Promise<Operativo>;
  guardarParticipaciones(participaciones: ParticipacionBase[]): Promise<void>;
  guardarResponsables(responsables: ResponsableOperativo[]): Promise<void>;
  /** Cantidad de operativos creados en el año (para el consecutivo del codigo). */
  contarDelAnio(anio: number): Promise<number>;
  contarIncidentesVinculados(operativoId: string): Promise<number>;
}

/**
 * Puerto de referencias externas: bases navales y usuarios. Son tablas de otros
 * modulos, asi que se leen por aqui (solo lectura) en lugar de importar sus
 * repositorios o entidades.
 */
export const REFERENCIAS_OPERATIVO = Symbol('REFERENCIAS_OPERATIVO');

export interface ReferenciasOperativoPort {
  obtenerBases(ids: readonly string[]): Promise<BaseCandidata[]>;
  listarBasesActivas(): Promise<BaseCandidata[]>;
  /** Devuelve los ids de usuarios ACTIVOS que existen entre los pedidos. */
  usuariosActivos(ids: readonly string[]): Promise<string[]>;
  zonaExiste(zonaId: string): Promise<boolean>;
}

/**
 * Puerto PUBLICO del modulo (lo exporta OperativosModule): lo consume
 * Incidentes para vincular un enfrentamiento al operativo del que salio.
 */
export const OPERATIVO_READER = Symbol('OPERATIVO_READER');

export interface OperativoResumen {
  readonly id: string;
  readonly codigo: string;
  readonly estado: EstadoOperativo;
  readonly basesIds: string[];
}

export interface OperativoReaderPort {
  obtenerResumen(id: string): Promise<OperativoResumen | null>;
}
