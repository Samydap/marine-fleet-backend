import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error';
import {
  USUARIO_REPOSITORY,
  type UsuarioRepositoryPort,
} from '../../usuarios/domain/usuario.repository.port';
import { MFA_PROVIDER, type MfaProviderPort } from '../domain/mfa-provider.port';
import { TOKEN_ISSUER, type TokenIssuerPort } from '../domain/token-issuer.port';
import type { SesionIniciada } from './login.use-case';

export interface VerifyMfaInput {
  readonly challengeToken: string;
  readonly codigo: string;
}

/**
 * RF-7. Segundo paso del login: canjea el reto + el codigo TOTP por la sesion.
 *
 * Un codigo incorrecto cuenta como intento fallido (igual que una contraseña
 * mala): con 5 seguidos la cuenta se bloquea, asi no se puede probar los un
 * millon de codigos posibles.
 */
@Injectable()
export class VerifyMfaUseCase implements UseCase<VerifyMfaInput, SesionIniciada> {
  private readonly maxIntentos: number;

  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepositoryPort,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuerPort,
    @Inject(MFA_PROVIDER) private readonly mfa: MfaProviderPort,
    config: ConfigService,
  ) {
    this.maxIntentos = config.get<number>('jwt.maxIntentosFallidos') ?? 5;
  }

  async execute(input: VerifyMfaInput): Promise<SesionIniciada> {
    const usuarioId = await this.tokens.verificarRetoMfa(input.challengeToken);
    const usuario = await this.usuarios.buscarPorIdConCredenciales(usuarioId);
    if (!usuario || !usuario.mfaHabilitado || !usuario.mfaSecretoCifrado || !usuario.rol?.activo) {
      throw new UnauthorizedError('La sesion ya no es valida.', 'SESION_INVALIDA');
    }
    usuario.puedeIniciarSesion();

    const secreto = this.mfa.descifrar(usuario.mfaSecretoCifrado);
    if (!this.mfa.verificarCodigo(secreto, input.codigo)) {
      usuario.registrarIntentoFallido(this.maxIntentos);
      await this.usuarios.guardar(usuario);
      throw new UnauthorizedError('El codigo no es correcto.', 'CODIGO_MFA_INVALIDO');
    }

    usuario.registrarAccesoExitoso();
    await this.usuarios.guardar(usuario);

    const emitidos = await this.tokens.emitir({
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol.codigo,
      permisos: usuario.rol.permisos,
      baseNavalId: usuario.baseNavalId,
    });
    return { ...emitidos, usuario };
  }
}
