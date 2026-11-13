import type { DetalleOperativo } from '../../application/obtener-operativo.use-case';
import type {
  EstadoOperativo,
  PrioridadOperativo,
  ResultadoOperativo,
  RolParticipacion,
} from '../../domain/estado-operativo.enum';
import type { Operativo } from '../../domain/operativo.entity';

export interface ParticipacionResponse {
  baseNavalId: string;
  rolParticipacion: RolParticipacion;
  unidadesAsignadas: number;
  recursos: string | null;
  confirmada: boolean;
  observaciones: string | null;
}

export interface OperativoResponse {
  id: string;
  codigo: string;
  nombre: string;
  objetivoCriminalId: string | null;
  objetivo: string | null;
  descripcion: string | null;
  zonaInfluenciaId: string;
  baseLiderId: string;
  estado: EstadoOperativo;
  prioridad: PrioridadOperativo;
  fechaInicioPlaneada: Date | null;
  fechaInicioReal: Date | null;
  fechaCierre: Date | null;
  resultadoFinal: ResultadoOperativo | null;
  observacionesCierre: string | null;
  bases: ParticipacionResponse[];
  responsables: Array<{ usuarioId: string; funcion: string }>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DetalleOperativoResponse extends OperativoResponse {
  criminal: {
    id: string;
    nombre: string;
    estado: string;
    nivelAmenaza: string;
    recompensaVigenteMonto: number | null;
  } | null;
  incidentesVinculados: number;
}

export function aOperativoResponse(operativo: Operativo): OperativoResponse {
  return {
    id: operativo.id,
    codigo: operativo.codigo,
    nombre: operativo.nombre,
    objetivoCriminalId: operativo.objetivoCriminalId,
    objetivo: operativo.objetivo,
    descripcion: operativo.descripcion,
    zonaInfluenciaId: operativo.zonaInfluenciaId,
    baseLiderId: operativo.baseLiderId,
    estado: operativo.estado,
    prioridad: operativo.prioridad,
    fechaInicioPlaneada: operativo.fechaInicioPlaneada,
    fechaInicioReal: operativo.fechaInicioReal,
    fechaCierre: operativo.fechaCierre,
    resultadoFinal: operativo.resultadoFinal,
    observacionesCierre: operativo.observacionesCierre,
    bases: (operativo.bases ?? []).map((p) => ({
      baseNavalId: p.baseNavalId,
      rolParticipacion: p.rolParticipacion,
      unidadesAsignadas: p.unidadesAsignadas,
      recursos: p.recursos,
      confirmada: Boolean(p.confirmada),
      observaciones: p.observaciones,
    })),
    responsables: (operativo.responsables ?? []).map((r) => ({
      usuarioId: r.usuarioId,
      funcion: r.funcion,
    })),
    version: Number(operativo.version),
    createdAt: operativo.createdAt,
    updatedAt: operativo.updatedAt,
  };
}

export function aDetalleOperativoResponse(detalle: DetalleOperativo): DetalleOperativoResponse {
  const { criminal } = detalle;
  return {
    ...aOperativoResponse(detalle.operativo),
    criminal: criminal
      ? {
          id: criminal.id,
          nombre: criminal.nombre,
          estado: criminal.estado,
          nivelAmenaza: criminal.nivelAmenaza,
          recompensaVigenteMonto: criminal.recompensaVigenteMonto,
        }
      : null,
    incidentesVinculados: detalle.incidentesVinculados,
  };
}
