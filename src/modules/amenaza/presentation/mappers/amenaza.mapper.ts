import type { NivelAmenaza } from '../../../../shared/domain/value-objects/nivel-amenaza.enum';
import type { AnalisisRiesgo } from '../../domain/analisis-riesgo.entity';
import type { CriterioAmenaza } from '../../domain/criterio-amenaza.entity';

export interface CriterioResponse {
  id: string;
  nivel: NivelAmenaza;
  montoMinimo: number;
  montoMaximo: number | null;
  vigente: boolean;
  vigenteDesde: Date;
  vigenteHasta: Date | null;
  modificadoPor: string | null;
  motivo: string | null;
}

export interface AnalisisResponse {
  id: string;
  criminalId: string;
  fechaAnalisis: Date;
  montoEvaluado: number | null;
  nivelBase: NivelAmenaza;
  nivelResultante: NivelAmenaza;
  escalado: boolean;
  justificacion: string;
  ejecutadoPor: string | null;
}

export function aCriterioResponse(c: CriterioAmenaza): CriterioResponse {
  return {
    id: c.id,
    nivel: c.nivel,
    montoMinimo: Number(c.montoMinimo),
    montoMaximo: c.montoMaximo === null ? null : Number(c.montoMaximo),
    vigente: Boolean(c.vigente),
    vigenteDesde: c.vigenteDesde,
    vigenteHasta: c.vigenteHasta,
    modificadoPor: c.modificadoPor,
    motivo: c.motivo,
  };
}

export function aAnalisisResponse(a: AnalisisRiesgo): AnalisisResponse {
  return {
    id: a.id,
    criminalId: a.criminalId,
    fechaAnalisis: a.fechaAnalisis,
    montoEvaluado: a.montoEvaluado,
    nivelBase: a.nivelBase,
    nivelResultante: a.nivelResultante,
    escalado: Boolean(a.escalado),
    justificacion: a.justificacion,
    ejecutadoPor: a.ejecutadoPor,
  };
}
