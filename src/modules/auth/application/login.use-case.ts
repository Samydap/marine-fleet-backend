import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error';
import type { Usuario } from '../../usuarios/domain/usuario.entity';
import {
  USUARIO_REPOSITORY,
  type UsuarioRepositoryPort,
} from '../../usuarios/domain/usuario.repository.port';
import { PASSWORD_HASHER, type PasswordHasherPort } from '../domain/password-hasher.port';
import { TOKEN_ISSUER, type TokenIssuerPort } from '../domain/token-issuer.port';

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

export interface SesionIniciada {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly usuario: Usuario;
}

/**
 * El mismo mensaje para "el correo no existe" y "la contraseña es incorrecta":
 * distinguirlos le diria a un atacante que correos estan registrados.
 */
const CREDENCIALES_INVALIDAS = 'Correo o contraseña incorrectos.';

/**
 * RF-7. Valida credenciales y emite los tokens de la sesion.
 *
 * Reglas:
 *  - Una cuenta BLOQUEADA o INACTIVA no entra aunque la contraseña sea correcta.
 *  - Cada fallo suma a `intentos_fallidos`; al llegar al maximo configurado
 *    (MAX_INTENTOS_FALLIDOS) la cuenta queda BLOQUEADA.
 *  - Un acceso exitoso reinicia el contador y registra `ultimo_acceso`.
 *
 * PENDIENTE: el segundo factor. Los roles con `requiere_2fa` todavia entran
 * solo con contraseña; el reto TOTP llega con verify-mfa.use-case.ts.
 */
@Injectable()
export class LoginUseCase implements UseCase<LoginInput, SesionIniciada> {
  private readonly maxIntentos: number;

  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuerPort,
    config: ConfigService,
  ) {
    this.maxIntentos = config.get<number>('jwt.maxIntentosFallidos') ?? 5;
  }

  async execute(input: LoginInput): Promise<SesionIniciada> {
    const email = input.email.trim().toLowerCase();

    const usuario = await this.usuarios.buscarPorEmailConCredenciales(email);
    if (!usuario) {
      throw new UnauthorizedError(CREDENCIALES_INVALIDAS, 'CREDENCIALES_INVALIDAS');
    }

    usuario.puedeIniciarSesion();

    const coincide = await this.hasher.comparar(input.password, usuario.passwordHash);
    if (!coincide) {
      usuario.registrarIntentoFallido(this.maxIntentos);
      await this.usuarios.guardar(usuario);
      throw new UnauthorizedError(CREDENCIALES_INVALIDAS, 'CREDENCIALES_INVALIDAS');
    }

    const rol = usuario.rol;
    if (!rol || !rol.activo) {
      throw new DomainError('El rol asignado a esta cuenta no esta activo.', 'ROL_INACTIVO');
    }

    usuario.registrarAccesoExitoso();
    await this.usuarios.guardar(usuario);

    const emitidos = await this.tokens.emitir({
      sub: usuario.id,
      email: usuario.email,
      rol: rol.codigo,
      permisos: rol.permisos,
      baseNavalId: usuario.baseNavalId,
    });

    return { ...emitidos, usuario };
  }
}
