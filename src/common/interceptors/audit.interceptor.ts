import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { tap, type Observable } from 'rxjs';
import type { AuthenticatedUser } from '../../shared/domain/rbac/authenticated-user';
import { AUDIT_KEY } from '../decorators/audit.decorator';

/**
 * Bitacora de acciones sensibles (RF-7). Registra quien, que, cuando y desde
 * donde. Hoy escribe al logger; cuando exista la tabla `bitacora_accesos` se
 * cambia solo este archivo.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AUDIT');

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const accion = this.reflector.get<string>(AUDIT_KEY, context.getHandler());
    if (!accion) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();

    return next.handle().pipe(
      tap(() =>
        this.logger.log(
          JSON.stringify({
            accion,
            usuarioId: request.user?.id ?? 'anonimo',
            rol: request.user?.rol ?? null,
            metodo: request.method,
            ruta: request.originalUrl,
            ip: request.ip,
            fecha: new Date().toISOString(),
          }),
        ),
      ),
    );
  }
}
