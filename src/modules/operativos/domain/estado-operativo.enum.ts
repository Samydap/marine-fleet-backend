export enum EstadoOperativo {
  PLANIFICADO = 'PLANIFICADO',
  EN_CURSO = 'EN_CURSO',
  CERRADO = 'CERRADO',
  ABORTADO = 'ABORTADO',
}

/**
 * Mapeo con el documento de requerimientos (que habla de planeado, en curso,
 * completado y abortado):
 *   planeado   -> PLANIFICADO
 *   en curso   -> EN_CURSO
 *   completado -> CERRADO (con un ResultadoOperativo)
 *   abortado   -> ABORTADO
 */
export enum PrioridadOperativo {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

/** Columna `operativos.resultado_final`: se fija al cerrar el operativo. */
export enum ResultadoOperativo {
  EXITOSO = 'EXITOSO',
  PARCIAL = 'PARCIAL',
  FALLIDO = 'FALLIDO',
}

export enum RolParticipacion {
  LIDER = 'LIDER',
  APOYO = 'APOYO',
  LOGISTICA = 'LOGISTICA',
  BLOQUEO = 'BLOQUEO',
}

const TRANSICIONES: Readonly<Record<EstadoOperativo, readonly EstadoOperativo[]>> = {
  [EstadoOperativo.PLANIFICADO]: [EstadoOperativo.EN_CURSO, EstadoOperativo.ABORTADO],
  [EstadoOperativo.EN_CURSO]: [EstadoOperativo.CERRADO, EstadoOperativo.ABORTADO],
  [EstadoOperativo.CERRADO]: [],
  [EstadoOperativo.ABORTADO]: [],
};

export function puedeTransicionarOperativo(
  desde: EstadoOperativo,
  hacia: EstadoOperativo,
): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

export function esEstadoFinal(estado: EstadoOperativo): boolean {
  return estado === EstadoOperativo.CERRADO || estado === EstadoOperativo.ABORTADO;
}
