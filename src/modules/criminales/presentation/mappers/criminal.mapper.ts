import type { Criminal } from '../../domain/criminal.entity';
import type {
  CategoriaOrganizacion,
  EstadoCriminal,
  NivelAmenaza,
  RolMembresia,
} from '../../domain/estado-criminal.enum';
import type { Membresia } from '../../domain/membresia.entity';

export interface AfiliacionResponse {
  id: string;
  organizacionId: string;
  organizacionNombre: string | null;
  categoria: CategoriaOrganizacion | null;
  rol: RolMembresia;
  vigente: boolean;
  fechaIngreso: Date | null;
  fechaSalida: Date | null;
}

export interface CriminalResponse {
  id: string;
  nombre: string;
  alias: string[];
  edad: number | null;
  descripcionFisica: string | null;
  fotoUrl: string | null;
  estado: EstadoCriminal;
  nivelAmenaza: NivelAmenaza;
  recompensaVigenteMonto: number | null;
  zonaInfluenciaId: string | null;
  /** Afiliacion principal vigente (la de mayor rango) o null. */
  organizacion: AfiliacionResponse | null;
  fechaBaja: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CriminalDetalleResponse extends CriminalResponse {
  /** Todas las afiliaciones vigentes. */
  afiliaciones: AfiliacionResponse[];
  origenBaseId: string | null;
  creadoPor: string | null;
  actualizadoPor: string | null;
}

export function aAfiliacionResponse(membresia: Membresia): AfiliacionResponse {
  return {
    id: membresia.id,
    organizacionId: membresia.organizacionId,
    organizacionNombre: membresia.organizacion?.nombre ?? null,
    categoria: membresia.organizacion?.categoria ?? null,
    rol: membresia.rol,
    vigente: Boolean(membresia.vigente),
    fechaIngreso: membresia.fechaIngreso,
    fechaSalida: membresia.fechaSalida,
  };
}

/**
 * La entidad NUNCA se devuelve tal cual: el mapper decide que sale al cliente.
 * Sin esta capa, agregar una columna interna la publica sin querer en la API.
 */
export function aCriminalResponse(criminal: Criminal): CriminalResponse {
  const principal = criminal.membresiaPrincipal();
  return {
    id: criminal.id,
    nombre: criminal.nombre,
    alias: criminal.alias ?? [],
    edad: criminal.edad,
    descripcionFisica: criminal.descripcionFisica,
    fotoUrl: criminal.foto?.url ?? null,
    estado: criminal.estado,
    nivelAmenaza: criminal.nivelAmenaza,
    recompensaVigenteMonto: criminal.recompensaVigenteMonto,
    zonaInfluenciaId: criminal.zonaInfluenciaId,
    organizacion: principal ? aAfiliacionResponse(principal) : null,
    fechaBaja: criminal.fechaBaja,
    version: Number(criminal.version),
    createdAt: criminal.createdAt,
    updatedAt: criminal.updatedAt,
  };
}

export function aCriminalDetalleResponse(criminal: Criminal): CriminalDetalleResponse {
  return {
    ...aCriminalResponse(criminal),
    afiliaciones: (criminal.membresias ?? []).filter((m) => m.vigente).map(aAfiliacionResponse),
    origenBaseId: criminal.origenBaseId,
    creadoPor: criminal.creadoPor,
    actualizadoPor: criminal.actualizadoPor,
  };
}
