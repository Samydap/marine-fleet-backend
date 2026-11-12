import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type {
  IncidenteRegistradoEvent,
  OperativoActualizadoEvent,
  RecompensaSolicitadaEvent,
  ReporteRecibidoEvent,
} from '../../../shared/domain/events/eventos.contracts';

/** Notificacion por crear, antes de tener id. `baseNavalId` null = global. */
export interface NotificacionNueva {
  readonly baseNavalId: string | null;
  readonly tipo: string;
  readonly titulo: string;
  readonly mensaje: string;
  readonly referenciaTipo: string;
  readonly referenciaId: string;
}

const TEXTO_OPERATIVO: Record<
  OperativoActualizadoEvent['cambio'],
  (e: OperativoActualizadoEvent) => string
> = {
  CREADO: (e) =>
    `Nuevo operativo ${e.codigo} con participacion de tu base (prioridad ${e.prioridad}).`,
  ESTADO: (e) => `El operativo ${e.codigo} cambio a estado ${e.estado}.`,
  PRIORIDAD: (e) => `El operativo ${e.codigo} cambio su prioridad a ${e.prioridad}.`,
  BASES: (e) => `Se actualizaron las bases asignadas al operativo ${e.codigo}.`,
  RESPONSABLES: (e) => `Se actualizaron los responsables del operativo ${e.codigo}.`,
  CERRADO: (e) => `El operativo ${e.codigo} fue cerrado.`,
};

/**
 * RF-4 "notificar a las bases navales asignadas cuando cambie el estado o la
 * prioridad de un operativo". Decide QUE notificacion recibe QUIEN a partir de
 * un evento. Funcion pura: se prueba sin base de datos ni NestJS.
 */
export function construirNotificaciones(evento: string, payload: unknown): NotificacionNueva[] {
  switch (evento) {
    case EVENTOS.OPERATIVO_ACTUALIZADO: {
      const e = payload as OperativoActualizadoEvent;
      return e.basesIds.map((baseNavalId) => ({
        baseNavalId,
        tipo: `OPERATIVO_${e.cambio}`,
        titulo: `Operativo ${e.codigo}`,
        mensaje: TEXTO_OPERATIVO[e.cambio](e),
        referenciaTipo: 'operativo',
        referenciaId: e.operativoId,
      }));
    }
    case EVENTOS.INCIDENTE_REGISTRADO: {
      const e = payload as IncidenteRegistradoEvent;
      if (!e.baseNavalId) return [];
      return [
        {
          baseNavalId: e.baseNavalId,
          tipo: 'INCIDENTE_REGISTRADO',
          titulo: 'Nuevo enfrentamiento',
          mensaje: `Se registro un enfrentamiento con ${e.criminalesIds.length} criminal(es).`,
          referenciaTipo: 'incidente',
          referenciaId: e.incidenteId,
        },
      ];
    }
    case EVENTOS.REPORTE_RECIBIDO: {
      const e = payload as ReporteRecibidoEvent;
      return [
        {
          baseNavalId: null,
          tipo: 'REPORTE_CIUDADANO',
          titulo: 'Reporte ciudadano pendiente',
          mensaje: 'Llego un reporte ciudadano que requiere verificacion.',
          referenciaTipo: 'reporte',
          referenciaId: e.reporteId,
        },
      ];
    }
    case EVENTOS.RECOMPENSA_SOLICITADA: {
      const e = payload as RecompensaSolicitadaEvent;
      if (!e.requiereValidacion) return [];
      return [
        {
          baseNavalId: null,
          tipo: 'RECOMPENSA_POR_VALIDAR',
          titulo: 'Recompensa pendiente de validacion',
          mensaje: `Una recompensa de ${e.monto} berries requiere la firma del Almirante.`,
          referenciaTipo: 'recompensa',
          referenciaId: e.recompensaId,
        },
      ];
    }
    default:
      return [];
  }
}

/** Eventos que generan notificaciones persistentes. */
export const EVENTOS_NOTIFICABLES = [
  EVENTOS.OPERATIVO_ACTUALIZADO,
  EVENTOS.INCIDENTE_REGISTRADO,
  EVENTOS.REPORTE_RECIBIDO,
  EVENTOS.RECOMPENSA_SOLICITADA,
] as const;
