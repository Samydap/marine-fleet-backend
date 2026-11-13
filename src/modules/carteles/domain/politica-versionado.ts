import { MotivoGeneracion } from './cartel.entity';

/**
 * RF-2. Decide si un cambio en el criminal obliga a emitir un cartel nuevo.
 * Sin esta regla, el sistema regenera carteles por cualquier edicion (un typo en
 * la descripcion fisica) y la tabla `carteles` se llena de versiones inutiles.
 */
const MOTIVOS_QUE_OBLIGAN_NUEVA_VERSION: readonly MotivoGeneracion[] = [
  MotivoGeneracion.REGISTRO,
  MotivoGeneracion.CAMBIO_FOTO,
  MotivoGeneracion.CAMBIO_RECOMPENSA,
  MotivoGeneracion.CAMBIO_ESTADO,
  MotivoGeneracion.CAMBIO_AFILIACION,
  MotivoGeneracion.CAMBIO_DATOS,
];

export function requiereNuevaVersion(motivo: MotivoGeneracion): boolean {
  return MOTIVOS_QUE_OBLIGAN_NUEVA_VERSION.includes(motivo);
}

export function siguienteVersion(versionVigente: number | null): number {
  return (versionVigente ?? 0) + 1;
}
