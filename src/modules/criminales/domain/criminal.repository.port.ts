import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { Criminal } from './criminal.entity';
import type { EstadoCriminal, NivelAmenaza } from './estado-criminal.enum';

export const CRIMINAL_REPOSITORY = Symbol('CRIMINAL_REPOSITORY');

export interface FiltroCriminales {
  readonly q?: string;
  readonly estado?: EstadoCriminal;
  readonly nivelAmenaza?: NivelAmenaza;
  readonly zonaInfluenciaId?: string;
  readonly organizacionId?: string;
  readonly page: number;
  readonly limit: number;
  readonly order: 'ASC' | 'DESC';
}

/**
 * Puerto del repositorio. Los casos de uso dependen de ESTA interfaz, nunca del
 * adaptador de TypeORM: por eso se pueden probar sin base de datos y por eso
 * otro dev puede stubearla antes de que el adaptador exista.
 */
export interface CriminalRepositoryPort {
  buscarPorId(id: string): Promise<Criminal | null>;
  buscarPorNombreNormalizado(nombreNormalizado: string): Promise<Criminal | null>;
  listar(filtro: FiltroCriminales): Promise<PageResult<Criminal>>;
  guardar(criminal: Criminal): Promise<Criminal>;
  existe(id: string): Promise<boolean>;
}

/**
 * Puerto de SOLO LECTURA que los demas modulos consumen (Carteles, Operativos,
 * Incidentes, Inteligencia). Es la frontera publica del modulo: quien lo use no
 * puede modificar criminales, solo leerlos.
 */
export const CRIMINAL_READER = Symbol('CRIMINAL_READER');

export interface CriminalResumen {
  readonly id: string;
  readonly nombre: string;
  readonly alias: string[];
  readonly estado: EstadoCriminal;
  readonly nivelAmenaza: NivelAmenaza;
  readonly recompensaVigenteMonto: number | null;
  readonly zonaInfluenciaId: string | null;
}

export interface CriminalReaderPort {
  obtenerResumen(id: string): Promise<CriminalResumen | null>;
  existe(id: string): Promise<boolean>;
}
