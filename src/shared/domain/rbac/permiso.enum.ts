import { RolCodigo } from './rol.enum';

/** Permisos atomicos. Se persisten en `roles.permisos` (columna JSON). */
export enum Permiso {
  TODO = 'ALL',

  CRIMINALES_LEER = 'CRIMINALES_LEER',
  CRIMINALES_ESCRIBIR = 'CRIMINALES_ESCRIBIR',

  RECOMPENSAS_SOLICITAR = 'RECOMPENSAS_SOLICITAR',
  RECOMPENSAS_VALIDAR = 'RECOMPENSAS_VALIDAR',

  CARTELES_GENERAR = 'CARTELES_GENERAR',

  INTELIGENCIA_LEER = 'INTELIGENCIA_LEER',
  INTELIGENCIA_ESCRIBIR = 'INTELIGENCIA_ESCRIBIR',
  INTELIGENCIA_REVISAR_REPORTES = 'INTELIGENCIA_REVISAR_REPORTES',

  OPERATIVOS_LEER = 'OPERATIVOS_LEER',
  OPERATIVOS_COORDINAR = 'OPERATIVOS_COORDINAR',

  INCIDENTES_LEER = 'INCIDENTES_LEER',
  INCIDENTES_ESCRIBIR = 'INCIDENTES_ESCRIBIR',

  AMENAZA_CONFIGURAR_CRITERIOS = 'AMENAZA_CONFIGURAR_CRITERIOS',

  REPORTES_LEER = 'REPORTES_LEER',
  CATALOGOS_ADMINISTRAR = 'CATALOGOS_ADMINISTRAR',

  USUARIOS_ADMINISTRAR = 'USUARIOS_ADMINISTRAR',
  AUDITORIA_LEER = 'AUDITORIA_LEER',
  SISTEMA_CONFIGURAR = 'SISTEMA_CONFIGURAR',
}

/**
 * Matriz RBAC de referencia: alimenta el seed de la tabla `roles`.
 * El backend decide a partir de esto; el frontend solo oculta.
 */
export const PERMISOS_POR_ROL: Readonly<Record<RolCodigo, readonly Permiso[]>> = {
  [RolCodigo.ALMIRANTE]: [Permiso.TODO],

  [RolCodigo.DIRECTOR_INTELIGENCIA]: [
    Permiso.CRIMINALES_LEER,
    Permiso.CRIMINALES_ESCRIBIR,
    Permiso.INTELIGENCIA_LEER,
    Permiso.INTELIGENCIA_ESCRIBIR,
    Permiso.INTELIGENCIA_REVISAR_REPORTES,
    Permiso.OPERATIVOS_LEER,
    Permiso.INCIDENTES_LEER,
    Permiso.CARTELES_GENERAR,
    Permiso.REPORTES_LEER,
  ],

  [RolCodigo.ANALISTA_DATOS_CRIMINALES]: [
    Permiso.CRIMINALES_LEER,
    Permiso.CRIMINALES_ESCRIBIR,
    Permiso.RECOMPENSAS_SOLICITAR,
    Permiso.CARTELES_GENERAR,
    Permiso.INTELIGENCIA_LEER,
    Permiso.INCIDENTES_LEER,
    Permiso.OPERATIVOS_LEER,
    // RNF: UNICAMENTE el Analista modifica los criterios de clasificacion.
    // El endpoint ademas exige @Roles(ANALISTA_DATOS_CRIMINALES), asi que ni el
    // permiso ALL del Almirante lo abre.
    Permiso.AMENAZA_CONFIGURAR_CRITERIOS,
    Permiso.REPORTES_LEER,
  ],

  [RolCodigo.COORDINADOR_OPERACIONES]: [
    Permiso.CRIMINALES_LEER,
    Permiso.INTELIGENCIA_LEER,
    Permiso.OPERATIVOS_LEER,
    Permiso.OPERATIVOS_COORDINAR,
    Permiso.INCIDENTES_LEER,
    Permiso.INCIDENTES_ESCRIBIR,
    Permiso.CATALOGOS_ADMINISTRAR,
    Permiso.REPORTES_LEER,
  ],

  [RolCodigo.DESARROLLADOR_BACKEND]: [
    Permiso.CRIMINALES_LEER,
    Permiso.INTELIGENCIA_LEER,
    Permiso.OPERATIVOS_LEER,
    Permiso.INCIDENTES_LEER,
    Permiso.SISTEMA_CONFIGURAR,
  ],

  [RolCodigo.ESPECIALISTA_SEGURIDAD]: [
    Permiso.USUARIOS_ADMINISTRAR,
    Permiso.AUDITORIA_LEER,
    Permiso.SISTEMA_CONFIGURAR,
    Permiso.CRIMINALES_LEER,
  ],

  [RolCodigo.CAPITAN]: [
    Permiso.CRIMINALES_LEER,
    Permiso.CRIMINALES_ESCRIBIR,
    Permiso.RECOMPENSAS_SOLICITAR,
    Permiso.INTELIGENCIA_LEER,
    Permiso.INTELIGENCIA_ESCRIBIR,
    Permiso.OPERATIVOS_LEER,
    Permiso.INCIDENTES_LEER,
    Permiso.INCIDENTES_ESCRIBIR,
  ],
};

export function tienePermiso(permisos: readonly string[], requerido: Permiso): boolean {
  return permisos.includes(Permiso.TODO) || permisos.includes(requerido);
}
