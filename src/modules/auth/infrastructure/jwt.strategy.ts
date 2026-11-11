import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser, JwtPayload } from '../../../shared/domain/rbac/authenticated-user';

/**
 * Convierte el token en el objeto que los guards leen de `request.user`.
 * Los permisos viajan en el token para no consultar la base en cada peticion;
 * el precio es que un cambio de rol surte efecto al renovar el token (15 min).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token sin sujeto.');
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
