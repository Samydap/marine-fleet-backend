import { SetMetadata } from '@nestjs/common';
import type { Permiso } from '../../shared/domain/rbac/permiso.enum';
import type { RolCodigo } from '../../shared/domain/rbac/rol.enum';

export const ROLES_KEY = 'rbac:roles';
export const PERMISOS_KEY = 'rbac:permisos';

/**
 * Restringe un endpoint a ciertos roles.
 * @example @Roles(RolCodigo.ALMIRANTE, RolCodigo.DIRECTOR_INTELIGENCIA)
 */
export const Roles = (...roles: RolCodigo[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

/**
 * Restringe un endpoint a permisos concretos. Preferible a @Roles cuando la
 * regla es sobre la accion y no sobre el cargo: sobrevive a cambios de roles.
 * @example @RequierePermisos(Permiso.RECOMPENSAS_VALIDAR)
 */
export const RequierePermisos = (...permisos: Permiso[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISOS_KEY, permisos);
