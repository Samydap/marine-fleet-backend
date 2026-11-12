import type { OrganizacionConMiembros } from '../../application/consultar-organizaciones.use-case';
import type { Antecedente } from '../../domain/antecedente.entity';
import type {
  CategoriaOrganizacion,
  RolMembresia,
  TipoAgrupacion,
} from '../../domain/estado-criminal.enum';
import type { Membresia } from '../../domain/membresia.entity';
import type { Organizacion } from '../../domain/organizacion.entity';

export interface OrganizacionResponse {
  id: string;
  nombre: string;
  tipoAgrupacion: TipoAgrupacion;
  categoria: CategoriaOrganizacion;
  zonaInfluenciaId: string | null;
  descripcion: string | null;
  activa: boolean;
  version: number;
}

export interface MiembroResponse {
  membresiaId: string;
  criminalId: string;
  nombre: string | null;
  estado: string | null;
  recompensaVigenteMonto: number | null;
  rol: RolMembresia;
  vigente: boolean;
  fechaIngreso: Date | null;
  fechaSalida: Date | null;
}

export interface OrganizacionDetalleResponse extends OrganizacionResponse {
  lider: MiembroResponse | null;
  miembros: MiembroResponse[];
  totalMiembrosVigentes: number;
}

export interface AntecedenteResponse {
  id: string;
  criminalId: string;
  tipoDelito: string;
  descripcion: string;
  fechaHecho: Date | null;
  ubicacion: string | null;
  registradoPor: string | null;
  createdAt: Date;
}

export function aOrganizacionResponse(org: Organizacion): OrganizacionResponse {
  return {
    id: org.id,
    nombre: org.nombre,
    tipoAgrupacion: org.tipoAgrupacion,
    categoria: org.categoria,
    zonaInfluenciaId: org.zonaInfluenciaId,
    descripcion: org.descripcion,
    activa: Boolean(org.activa),
    version: Number(org.version),
  };
}

export function aMiembroResponse(m: Membresia): MiembroResponse {
  return {
    membresiaId: m.id,
    criminalId: m.criminalId,
    nombre: m.criminal?.nombre ?? null,
    estado: m.criminal?.estado ?? null,
    recompensaVigenteMonto: m.criminal?.recompensaVigenteMonto ?? null,
    rol: m.rol,
    vigente: Boolean(m.vigente),
    fechaIngreso: m.fechaIngreso,
    fechaSalida: m.fechaSalida,
  };
}

export function aOrganizacionDetalleResponse(
  detalle: OrganizacionConMiembros,
): OrganizacionDetalleResponse {
  return {
    ...aOrganizacionResponse(detalle.organizacion),
    lider: detalle.lider ? aMiembroResponse(detalle.lider) : null,
    miembros: detalle.miembros.map(aMiembroResponse),
    totalMiembrosVigentes: detalle.miembros.filter((m) => m.vigente).length,
  };
}

export function aAntecedenteResponse(a: Antecedente): AntecedenteResponse {
  return {
    id: a.id,
    criminalId: a.criminalId,
    tipoDelito: a.tipoDelito,
    descripcion: a.descripcion,
    fechaHecho: a.fechaHecho,
    ubicacion: a.ubicacion,
    registradoPor: a.registradoPor,
    createdAt: a.createdAt,
  };
}
