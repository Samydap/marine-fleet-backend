import { CanActivate, ForbiddenException, Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../shared/domain/rbac/authenticated-user';
import { Permiso, tienePermiso } from '../../shared/domain/rbac/permiso.enum';
import type { RolCodigo } from '../../shared/domain/rbac/rol.enum';
import { PERMISOS_KEY, ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * RF-7: control de acceso basado en roles. Guard GLOBAL, de modo que el RBAC se
 * implementa una vez y no siete veces (una por modulo, cada una distinta).
 *
 * Evalua primero permisos (@RequierePermisos) y luego roles (@Roles).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const metadata = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, metadata)) {
      return true;
    }

    const permisosRequeridos = this.reflector.getAllAndOverride<Permiso[]>(PERMISOS_KEY, metadata);
    const rolesRequeridos = this.reflector.getAllAndOverride<RolCodigo[]>(ROLES_KEY, metadata);

    if (!permisosRequeridos?.length && !rolesRequeridos?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const usuario = request.user;

    if (!usuario) {
      throw new ForbiddenException('Sesion no valida.');
    }

    if (permisosRequeridos?.length) {
      const autorizado = permisosRequeridos.every((p) => tienePermiso(usuario.permisos, p));
      if (!autorizado) {
        throw new ForbiddenException(
          `Tu rol (${usuario.rol}) no tiene los permisos requeridos: ${permisosRequeridos.join(', ')}.`,
        );
      }
    }

    if (rolesRequeridos?.length && !rolesRequeridos.includes(usuario.rol)) {
      throw new ForbiddenException(
        `Esta operacion esta restringida a: ${rolesRequeridos.join(', ')}.`,
      );
    }

    return true;
  }
}
