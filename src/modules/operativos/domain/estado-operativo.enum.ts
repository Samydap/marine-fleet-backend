export enum EstadoOperativo {
  PLANIFICADO = 'PLANIFICADO',
  EN_CURSO = 'EN_CURSO',
  CERRADO = 'CERRADO',
  ABORTADO = 'ABORTADO',
}

export enum PrioridadOperativo {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
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
