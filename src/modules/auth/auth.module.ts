import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

/**
 * `jsonwebtoken` no acepta un `string` cualquiera en `expiresIn`: exige su tipo
 * de duracion ("15m", "7d", un numero de segundos). Se deriva del tipo de la
 * libreria en lugar de castear a `any`, para que un valor mal escrito en el
 * .env siga siendo un error de compilacion aqui.
 */
type Expiracion = NonNullable<JwtModuleOptions['signOptions']>['expiresIn'];

import { PASSWORD_HASHER } from './domain/password-hasher.port';
import { BcryptHasherAdapter } from './infrastructure/bcrypt-hasher.adapter';
import { JwtStrategy } from './infrastructure/jwt.strategy';

/**
 * RF-7 Autenticacion. Dueño: Dev 1 (Especialista en Seguridad Informatica).
 *
 * PENDIENTE Sprint 1 (en este orden, porque desbloquea a los otros cinco devs):
 *  - application/login.use-case.ts         (valida credenciales, emite tokens)
 *  - application/refresh-token.use-case.ts
 *  - application/verify-mfa.use-case.ts
 *  - application/lock-account.use-case.ts  (usa usuarios.intentos_fallidos)
 *  - infrastructure/totp-mfa.adapter.ts
 *  - presentation/auth.controller.ts       (@Public() en login y refresh)
 *
 * La estrategia JWT y el hasher ya estan, de modo que JwtAuthGuard y RolesGuard
 * son funcionales en cuanto exista el endpoint de login.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<Expiracion>('jwt.expiresIn') ?? '15m' },
      }),
    }),
  ],
  providers: [JwtStrategy, { provide: PASSWORD_HASHER, useClass: BcryptHasherAdapter }],
  exports: [PASSWORD_HASHER, JwtModule],
})
export class AuthModule {}
