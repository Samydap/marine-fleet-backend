import { Permiso, tienePermiso } from '../../../shared/domain/rbac/permiso.enum';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';

/**
 * RF-1/RF-7. Regla de negocio: a partir de que monto una recompensa necesita la
 * firma de un Almirante.
 *
 * Esta en el dominio y no en el controller a proposito: es la clase de regla que
 * cambia (el umbral se ajusta) y que debe poder probarse sin HTTP ni base.
 */
export const UMBRAL_VALIDACION_ALMIRANTE = 1_000_000_000;

export function requiereValidacionDeAlmirante(monto: number): boolean {
  return monto >= UMBRAL_VALIDACION_ALMIRANTE;
}

export function asegurarPuedeValidar(permisos: readonly string[]): void {
  if (!tienePermiso(permisos, Permiso.RECOMPENSAS_VALIDAR)) {
    throw new ForbiddenError('validar recompensas');
  }
}
