import type {
  Avistamiento,
  EstadoVerificacion,
  OrigenAvistamiento,
} from '../../domain/avistamiento.entity';
import type { EstadoReporte, ReporteCiudadano } from '../../domain/reporte-ciudadano.entity';

/** Contrato con el frontend (features/inteligencia/models/avistamiento.ts), ampliado. */
export interface AvistamientoResponse {
  id: string;
  criminalId: string;
  criminalNombre: string;
  fechaHora: Date;
  ubicacion: string;
  testigo: string | null;
  zonaInfluenciaId: string | null;
  estadoVerificacion: EstadoVerificacion;
  origen: OrigenAvistamiento;
  observaciones: string | null;
  registradoPor: string | null;
  verificadoPor: string | null;
  createdAt: Date;
}

export function aAvistamientoResponse(
  a: Avistamiento,
  criminalNombre?: string,
): AvistamientoResponse {
  return {
    id: a.id,
    criminalId: a.criminalId,
    criminalNombre: criminalNombre ?? a.criminal?.nombre ?? '',
    fechaHora: a.fechaHora,
    ubicacion: a.ubicacion,
    testigo: a.testigo,
    zonaInfluenciaId: a.zonaInfluenciaId,
    estadoVerificacion: a.estadoVerificacion,
    origen: a.origen,
    observaciones: a.observaciones,
    registradoPor: a.registradoPor,
    verificadoPor: a.verificadoPor,
    createdAt: a.createdAt,
  };
}

export interface ReporteCiudadanoResponse {
  id: string;
  criminalId: string;
  descripcion: string;
  fechaHecho: Date | null;
  ubicacion: string;
  zonaInfluenciaId: string | null;
  informante: { nombre: string | null; contacto: string | null; anonimo: boolean };
  estado: EstadoReporte;
  revisadoPor: string | null;
  fechaRevision: Date | null;
  motivoRechazo: string | null;
  avistamientoId: string | null;
  createdAt: Date;
}

export function aReporteResponse(r: ReporteCiudadano): ReporteCiudadanoResponse {
  return {
    id: r.id,
    criminalId: r.criminalId,
    descripcion: r.descripcion,
    fechaHecho: r.fechaHecho,
    ubicacion: r.ubicacion,
    zonaInfluenciaId: r.zonaInfluenciaId,
    informante: {
      nombre: r.informante?.nombre ?? null,
      contacto: r.informante?.contacto ?? null,
      anonimo: Boolean(r.informante?.anonimo),
    },
    estado: r.estado,
    revisadoPor: r.revisadoPor,
    fechaRevision: r.fechaRevision,
    motivoRechazo: r.motivoRechazo,
    avistamientoId: r.avistamientoId,
    createdAt: r.createdAt,
  };
}
