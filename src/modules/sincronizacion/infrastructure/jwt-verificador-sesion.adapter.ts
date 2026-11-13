import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error';
import type { AuthenticatedUser, JwtPayload } from '../../../shared/domain/rbac/authenticated-user';
import type { VerificadorSesionPort } from '../domain/sincronizacion.ports';

/**
 * Verifica el access token del canal SSE con el MISMO secreto que JwtStrategy.
 * El refresh token esta firmado con otro secreto, asi que aqui no sirve.
 */
@Injectable()
export class JwtVerificadorSesionAdapter implements VerificadorSesionPort {
  constructor(private readonly jwt: JwtService) {}

  verificar(token: string): AuthenticatedUser {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedError('Token invalido o expirado.', 'TOKEN_INVALIDO');
    }
    // Solo access tokens: un reto MFA (tipo 'mfa') no abre el canal.
    if (!payload?.sub || (payload as { tipo?: unknown }).tipo !== undefined || !payload.rol) {
      throw new UnauthorizedError('El token no es un access token.', 'TOKEN_INVALIDO');
    }

    return {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol,
      permisos: payload.permisos ?? [],
      baseNavalId: payload.baseNavalId ?? null,
    };
  }
}
