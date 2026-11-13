import type { Incidente, MarinoParticipante } from '../../domain/incidente.entity';
import type {
  DesenlaceParticipante,
  ResultadoEnfrentamiento,
  RolEnIncidente,
  TipoIncidente,
} from '../../domain/resultado-enfrentamiento.enum';

export interface IncidenteResponse {
  id: string;
  tipo: TipoIncidente;
  resultado: ResultadoEnfrentamiento;
  cerrado: boolean;
  fechaHora: Date;
  ubicacion: string;
  zonaInfluenciaId: string | null;
  baseNavalId: string | null;
  operativoId: string | null;
  descripcion: string;
  observaciones: string | null;
  bajasMarina: number;
  bajasEnemigas: number;
  criminales: Array<{
    criminalId: string;
    rolEnIncidente: RolEnIncidente;
    desenlace: DesenlaceParticipante;
    observaciones: string | null;
  }>;
  marinos: MarinoParticipante[];
  registradoPor: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export function aIncidenteResponse(incidente: Incidente): IncidenteResponse {
  return {
    id: incidente.id,
    tipo: incidente.tipo,
    resultado: incidente.resultado,
    cerrado: incidente.estaCerrado(),
    fechaHora: incidente.fechaHora,
    ubicacion: incidente.ubicacion,
    zonaInfluenciaId: incidente.zonaInfluenciaId,
    baseNavalId: incidente.baseNavalId,
    operativoId: incidente.operativoId,
    descripcion: incidente.descripcion,
    observaciones: incidente.observaciones,
    bajasMarina: incidente.bajasMarina,
    bajasEnemigas: incidente.bajasEnemigas,
    criminales: (incidente.participantes ?? []).map((p) => ({
      criminalId: p.criminalId,
      rolEnIncidente: p.rolEnIncidente,
      desenlace: p.desenlace,
      observaciones: p.observaciones,
    })),
    marinos: incidente.participantesMarina ?? [],
    registradoPor: incidente.registradoPor,
    version: Number(incidente.version),
    createdAt: incidente.createdAt,
    updatedAt: incidente.updatedAt,
  };
}
