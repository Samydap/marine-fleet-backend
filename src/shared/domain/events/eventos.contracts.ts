import type { NivelAmenaza } from '../value-objects/nivel-amenaza.enum';

/**
 * CONTRATO DE EVENTOS ENTRE MODULOS.
 *
 * Cada modulo publica hechos con `EventEmitter2.emit/emitAsync(EVENTOS.X, payload)`
 * y los demas escuchan con `@OnEvent(EVENTOS.X)`. Ningun modulo importa casos de
 * uso de otro: la frontera es este archivo. Si cambias un payload, cambias el
 * contrato de todos los oyentes, asi que va por PR al Lead.
 *
 * Los estados se tipan como string para que shared/ no dependa de los enums de
 * cada modulo (seria un import de shared hacia modules, prohibido).
 */

/** Por que cambio un criminal. Decide si Carteles emite version nueva y si Amenaza reclasifica. */
export type MotivoCambioCriminal = 'DATOS' | 'FOTO' | 'RECOMPENSA' | 'AFILIACION' | 'ZONA';

export interface CriminalRegistradoEvent {
  readonly criminalId: string;
  readonly usuarioId: string | null;
}

export interface CriminalActualizadoEvent {
  readonly criminalId: string;
  readonly usuarioId: string | null;
  readonly motivos: readonly MotivoCambioCriminal[];
}

export interface CriminalEstadoCambiadoEvent {
  readonly criminalId: string;
  readonly estadoAnterior: string;
  readonly estadoNuevo: string;
  readonly usuarioId: string | null;
}

export interface RecompensaSolicitadaEvent {
  readonly recompensaId: string;
  readonly criminalId: string;
  readonly monto: number;
  readonly requiereValidacion: boolean;
  readonly usuarioId: string | null;
}

export interface RecompensaVigenteEvent {
  readonly recompensaId: string;
  readonly criminalId: string;
  readonly monto: number;
  readonly moneda: string;
  readonly usuarioId: string | null;
}

export interface AmenazaReclasificadaEvent {
  readonly criminalId: string;
  readonly nivelAnterior: NivelAmenaza;
  readonly nivelNuevo: NivelAmenaza;
}

export interface CriteriosAmenazaActualizadosEvent {
  readonly usuarioId: string;
}

export interface CartelGeneradoEvent {
  readonly cartelId: string;
  readonly criminalId: string;
  readonly numeroVersion: number;
  readonly motivo: string;
}

export interface AvistamientoRegistradoEvent {
  readonly avistamientoId: string;
  readonly criminalId: string;
  readonly zonaInfluenciaId: string | null;
  readonly usuarioId: string | null;
}

export interface ReporteRecibidoEvent {
  readonly reporteId: string;
  readonly criminalId: string;
}

export interface ReporteAprobadoEvent {
  readonly reporteId: string;
  readonly avistamientoId: string;
  readonly criminalId: string;
  readonly usuarioId: string;
}

export type CambioOperativo = 'CREADO' | 'ESTADO' | 'PRIORIDAD' | 'BASES' | 'RESPONSABLES' | 'CERRADO';

export interface OperativoActualizadoEvent {
  readonly operativoId: string;
  readonly codigo: string;
  readonly cambio: CambioOperativo;
  readonly estado: string;
  readonly prioridad: string;
  /** Bases que deben enterarse (lider + participantes). */
  readonly basesIds: readonly string[];
  readonly usuarioId: string | null;
}

export interface IncidenteRegistradoEvent {
  readonly incidenteId: string;
  readonly operativoId: string | null;
  readonly baseNavalId: string | null;
  readonly criminalesIds: readonly string[];
}

export interface DesenlaceCriminal {
  readonly criminalId: string;
  /** CAPTURADO | ESCAPO | MUERTO | DESCONOCIDO */
  readonly desenlace: string;
}

export interface IncidenteCerradoEvent {
  readonly incidenteId: string;
  readonly operativoId: string | null;
  readonly resultado: string;
  readonly desenlaces: readonly DesenlaceCriminal[];
  readonly usuarioId: string | null;
}
