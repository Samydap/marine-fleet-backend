import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../shared/domain/rbac/authenticated-user';

/**
 * Inyecta el usuario autenticado en el handler.
 * @example async crear(@CurrentUser() usuario: AuthenticatedUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (campo: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const usuario = request.user;
    if (!usuario) return undefined;
    return campo ? usuario[campo] : usuario;
  },
);
