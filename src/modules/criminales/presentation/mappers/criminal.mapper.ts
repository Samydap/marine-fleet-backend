import type { Criminal } from '../../domain/criminal.entity';
import type { EstadoCriminal, NivelAmenaza } from '../../domain/estado-criminal.enum';

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
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * La entidad NUNCA se devuelve tal cual: el mapper decide que sale al cliente.
 * Sin esta capa, agregar una columna interna la publica sin querer en la API.
 */
export function aCriminalResponse(criminal: Criminal): CriminalResponse {
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
    version: Number(criminal.version),
    createdAt: criminal.createdAt,
    updatedAt: criminal.updatedAt,
  };
}
