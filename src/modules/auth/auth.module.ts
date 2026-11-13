import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UsuariosModule } from '../usuarios/usuarios.module';
import { LoginUseCase } from './application/login.use-case';
import { ObtenerSesionUseCase } from './application/obtener-sesion.use-case';
import { RefreshTokenUseCase } from './application/refresh-token.use-case';
import { PASSWORD_HASHER } from './domain/password-hasher.port';
import { TOKEN_ISSUER } from './domain/token-issuer.port';
import { BcryptHasherAdapter } from './infrastructure/bcrypt-hasher.adapter';
import { JwtTokenIssuerAdapter } from './infrastructure/jwt-token-issuer.adapter';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { AuthController } from './presentation/auth.controller';

/**
 * `jsonwebtoken` no acepta un `string` cualquiera en `expiresIn`: exige su tipo
 * de duracion ("15m", "7d", un numero de segundos). Se deriva del tipo de la
 * libreria en lugar de castear a `any`, para que un valor mal escrito en el
 * .env siga siendo un error de compilacion aqui.
 */
type Expiracion = NonNullable<JwtModuleOptions['signOptions']>['expiresIn'];

/**
 * RF-7 Autenticacion. Dueño: Dev 1 (Especialista en Seguridad Informatica).
 *
 * Implementado: POST /auth/login y GET /auth/me.
 *
 * Implementado tambien: POST /auth/refresh (renovacion con permisos vigentes).
 *
 * PENDIENTE (opcional, no lo exige el documento de requerimientos):
 *  - application/verify-mfa.use-case.ts + infrastructure/totp-mfa.adapter.ts
 *    El esquema y el puerto MFA_PROVIDER ya lo preven.
 */
@Module({
  imports: [
    UsuariosModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<Expiracion>('jwt.expiresIn') ?? '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    { provide: PASSWORD_HASHER, useClass: BcryptHasherAdapter },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuerAdapter },
    LoginUseCase,
    ObtenerSesionUseCase,
    RefreshTokenUseCase,
  ],
  exports: [PASSWORD_HASHER, JwtModule],
})
export class AuthModule {}
