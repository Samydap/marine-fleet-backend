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
 * Incidentes, Inteligencia, Amenaza, Reportes). Es la frontera publica del
 * modulo: quien lo use no puede modificar criminales, solo leerlos.
 */
export const CRIMINAL_READER = Symbol('CRIMINAL_READER');

export interface OrganizacionResumen {
  readonly id: string;
  readonly nombre: string;
  readonly categoria: string;
  readonly rol: string;
}

export interface CriminalResumen {
  readonly id: string;
  readonly nombre: string;
  readonly alias: string[];
  readonly estado: EstadoCriminal;
  readonly nivelAmenaza: NivelAmenaza;
  readonly recompensaVigenteMonto: number | null;
  readonly zonaInfluenciaId: string | null;
  readonly fotoUrl: string | null;
  /** Afiliacion vigente principal (la de mayor rango), o null si no tiene. */
  readonly organizacion: OrganizacionResumen | null;
}

export interface CriminalReaderPort {
  obtenerResumen(id: string): Promise<CriminalResumen | null>;
  existe(id: string): Promise<boolean>;
  /** Resumenes de varios criminales a la vez (para enriquecer listados ajenos). */
  obtenerResumenes(ids: readonly string[]): Promise<CriminalResumen[]>;
  /** Todos los criminales, con lo minimo para reclasificar o regenerar en lote. */
  listarTodosLosIds(): Promise<string[]>;
}

/**
 * Puerto de ESCRITURA ACOTADA para el modulo de Amenaza (RF-5).
 *
 * Amenaza DECIDE el nivel, Criminales lo PERSISTE. Este puerto es la unica
 * escritura que otro modulo puede hacer sobre el agregado Criminal, y solo toca
 * la columna `nivel_amenaza`. Se exporta junto a CRIMINAL_READER.
 */
export const CRIMINAL_NIVEL_WRITER = Symbol('CRIMINAL_NIVEL_WRITER');

export interface CriminalNivelWriterPort {
  /** Devuelve el nivel anterior, o null si el criminal no existe. */
  actualizarNivelAmenaza(
    criminalId: string,
    nivel: NivelAmenaza,
    usuarioId: string | null,
  ): Promise<NivelAmenaza | null>;
}
