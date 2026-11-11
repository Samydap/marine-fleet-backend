/** Columna `criminales.estado` del esquema. */
export enum EstadoCriminal {
  ACTIVO = 'ACTIVO',
  CAPTURADO = 'CAPTURADO',
  MUERTO = 'MUERTO',
}

/**
 * Columna `criminales.nivel_amenaza`. Este modulo la persiste pero NO la decide:
 * el valor lo calcula el modulo `amenaza` (RF-5). El enum vive en shared/domain
 * porque es vocabulario compartido entre ambos contextos.
 */
export { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';

/** RF-1: las tres categorias de entidad criminal del universo. */
export enum CategoriaOrganizacion {
  PIRATA = 'PIRATA',
  REVOLUCIONARIO = 'REVOLUCIONARIO',
  CRIMINAL_INDEPENDIENTE = 'CRIMINAL_INDEPENDIENTE',
}

export enum TipoAgrupacion {
  TRIPULACION = 'TRIPULACION',
  ORGANIZACION = 'ORGANIZACION',
  BANDA = 'BANDA',
}

export enum RolMembresia {
  LIDER = 'LIDER',
  OFICIAL = 'OFICIAL',
  MIEMBRO = 'MIEMBRO',
}

/** Transiciones de estado permitidas. Un criminal muerto no vuelve a activo. */
const TRANSICIONES: Readonly<Record<EstadoCriminal, readonly EstadoCriminal[]>> = {
  [EstadoCriminal.ACTIVO]: [EstadoCriminal.CAPTURADO, EstadoCriminal.MUERTO],
  [EstadoCriminal.CAPTURADO]: [EstadoCriminal.ACTIVO, EstadoCriminal.MUERTO],
  [EstadoCriminal.MUERTO]: [],
};

export function puedeTransicionar(desde: EstadoCriminal, hacia: EstadoCriminal): boolean {
  return TRANSICIONES[desde].includes(hacia);
}
