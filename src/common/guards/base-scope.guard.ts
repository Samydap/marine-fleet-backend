import { CanActivate, ForbiddenException, Injectable, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../shared/domain/rbac/authenticated-user';
import { Permiso, tienePermiso } from '../../shared/domain/rbac/permiso.enum';

/**
 * Aisla por base naval: un Capitan solo opera sobre su propia base.
 * Los roles globales (Almirante con permiso ALL) no quedan limitados.
 *
 * Se aplica por endpoint, no global, porque solo aplica donde la peticion
 * identifica una base: @UseGuards(BaseScopeGuard)
 */
@Injectable()
export class BaseScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const usuario = request.user;

    if (!usuario) {
      throw new ForbiddenException('Sesion no valida.');
    }

    if (tienePermiso(usuario.permisos, Permiso.TODO) || usuario.baseNavalId === null) {
      return true;
    }

    const baseSolicitada =
      (request.params as Record<string, string | undefined>)?.baseNavalId ??
      (request.query as Record<string, string | undefined>)?.baseNavalId ??
      (request.body as Record<string, string | undefined> | undefined)?.baseNavalId;

    if (baseSolicitada && baseSolicitada !== usuario.baseNavalId) {
      throw new ForbiddenException('Solo puedes operar sobre tu propia base naval.');
    }

    return true;
  }
}
