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

/** Contraseña correcta, pero la cuenta tiene segundo factor: falta el codigo. */
export interface RetoMfaEmitido {
  readonly mfaRequerido: true;
  readonly challengeToken: string;
  readonly email: string;
}

export type ResultadoLogin = SesionIniciada | RetoMfaEmitido;

export const esRetoMfa = (r: ResultadoLogin): r is RetoMfaEmitido => 'mfaRequerido' in r;

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
 *  - Si la cuenta tiene el segundo factor activo, NO entrega tokens: devuelve
 *    un reto (`challengeToken`, 5 min) que se canjea en POST /auth/mfa/verify
 *    junto con el codigo de 6 digitos de la app autenticadora.
 */
@Injectable()
export class LoginUseCase implements UseCase<LoginInput, ResultadoLogin> {
  private readonly maxIntentos: number;

  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuerPort,
    config: ConfigService,
  ) {
    this.maxIntentos = config.get<number>('jwt.maxIntentosFallidos') ?? 5;
  }

  async execute(input: LoginInput): Promise<ResultadoLogin> {
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

    if (usuario.mfaHabilitado && usuario.mfaSecretoCifrado) {
      // Los intentos fallidos se reinician recien cuando el codigo sea correcto.
      return {
        mfaRequerido: true,
        challengeToken: await this.tokens.emitirRetoMfa(usuario.id),
        email: usuario.email,
      };
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
