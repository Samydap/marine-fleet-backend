/**
 * Columna `criminales.nivel_amenaza` y `criterios_amenaza.nivel`.
 *
 * Vive en shared/domain porque es vocabulario compartido entre dos contextos:
 * `criminales` lo persiste y `amenaza` lo calcula. Si viviera dentro de uno de
 * los dos, el otro tendria que importar del dominio ajeno.
 */
export enum NivelAmenaza {
  BAJO = 'BAJO',
  MEDIO = 'MEDIO',
  ALTO = 'ALTO',
  PENDIENTE = 'PENDIENTE',
}

/** Orden de severidad para comparaciones y ordenamientos. */
export const SEVERIDAD: Readonly<Record<NivelAmenaza, number>> = {
  [NivelAmenaza.PENDIENTE]: 0,
  [NivelAmenaza.BAJO]: 1,
  [NivelAmenaza.MEDIO]: 2,
  [NivelAmenaza.ALTO]: 3,
};

export function esMasSevero(a: NivelAmenaza, b: NivelAmenaza): boolean {
  return SEVERIDAD[a] > SEVERIDAD[b];
}
