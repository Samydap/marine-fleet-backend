import type { AuthenticatedUser } from '../../../shared/domain/rbac/authenticated-user';
import { Permiso, tienePermiso } from '../../../shared/domain/rbac/permiso.enum';

/** Un hecho del sistema tal como viaja a las bases conectadas. */
export interface CambioSincronizado {
  /** Consecutivo del servidor: sirve de `Last-Event-ID` para reanudar. */
  readonly id: number;
  readonly evento: string;
  readonly datos: unknown;
  readonly fecha: string;
}

type UsuarioVisibilidad = Pick<AuthenticatedUser, 'permisos' | 'baseNavalId'>;

/**
 * Regla de visibilidad del canal: si el hecho va dirigido a bases concretas
 * (`basesIds` o `baseNavalId` en el payload), solo lo reciben esas bases y los
 * roles globales. Lo demas (un criminal actualizado, una recompensa) es
 * informacion centralizada y lo reciben todos.
 */
export function esVisiblePara(cambio: CambioSincronizado, usuario: UsuarioVisibilidad): boolean {
  if (usuario.baseNavalId === null || tienePermiso(usuario.permisos, Permiso.TODO)) {
    return true;
  }

  const datos = (cambio.datos ?? {}) as { basesIds?: unknown; baseNavalId?: unknown };
  if (Array.isArray(datos.basesIds)) {
    return datos.basesIds.includes(usuario.baseNavalId);
  }
  if (typeof datos.baseNavalId === 'string') {
    return datos.baseNavalId === usuario.baseNavalId;
  }
  return true;
}
