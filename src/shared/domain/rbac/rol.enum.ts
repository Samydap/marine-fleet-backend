/**
 * Codigos de rol del sistema (columna `roles.codigo` del esquema).
 * Son los seis roles definidos en el Caso 13 mas el rol de capitan de base.
 *
 * Vive en shared/domain porque lo consumen los guards de common/ y varios
 * modulos: no puede pertenecer a un modulo concreto sin acoplarlos entre si.
 */
export enum RolCodigo {
  ALMIRANTE = 'ALMIRANTE',
  DIRECTOR_INTELIGENCIA = 'DIRECTOR_INTELIGENCIA',
  ANALISTA_DATOS_CRIMINALES = 'ANALISTA_DATOS_CRIMINALES',
  COORDINADOR_OPERACIONES = 'COORDINADOR_OPERACIONES',
  DESARROLLADOR_BACKEND = 'DESARROLLADOR_BACKEND',
  ESPECIALISTA_SEGURIDAD = 'ESPECIALISTA_SEGURIDAD',
  CAPITAN = 'CAPITAN',
}

/** Roles que, por politica, exigen segundo factor de autenticacion. */
export const ROLES_CON_MFA_OBLIGATORIO: readonly RolCodigo[] = [
  RolCodigo.ALMIRANTE,
  RolCodigo.DIRECTOR_INTELIGENCIA,
  RolCodigo.ESPECIALISTA_SEGURIDAD,
];
