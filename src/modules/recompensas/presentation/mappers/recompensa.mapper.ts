import type { EstadoRecompensa } from '../../domain/estado-recompensa.enum';
import type { Recompensa } from '../../domain/recompensa.entity';

export interface RecompensaResponse {
  id: string;
  criminalId: string;
  monto: number;
  moneda: string;
  estado: EstadoRecompensa;
  requiereValidacion: boolean;
  solicitadaPor: string | null;
  fechaSolicitud: Date;
  validadaPor: string | null;
  fechaValidacion: Date | null;
  vigenteDesde: Date | null;
  vigenteHasta: Date | null;
  motivo: string | null;
}

export function aRecompensaResponse(r: Recompensa): RecompensaResponse {
  return {
    id: r.id,
    criminalId: r.criminalId,
    monto: Number(r.monto),
    moneda: r.moneda,
    estado: r.estado,
    requiereValidacion: Boolean(r.requiereValidacion),
    solicitadaPor: r.solicitadaPor,
    fechaSolicitud: r.fechaSolicitud,
    validadaPor: r.validadaPor,
    fechaValidacion: r.fechaValidacion,
    vigenteDesde: r.vigenteDesde,
    vigenteHasta: r.vigenteHasta,
    motivo: r.motivo,
  };
}
