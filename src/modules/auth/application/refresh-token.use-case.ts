import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error';
import { EstadoUsuario } from '../../usuarios/domain/usuario.entity';
import {
  USUARIO_REPOSITORY,
  type UsuarioRepositoryPort,
} from '../../usuarios/domain/usuario.repository.port';
import { TOKEN_ISSUER, type TokenIssuerPort } from '../domain/token-issuer.port';
import type { SesionIniciada } from './login.use-case';

/**
 * RF-7. Renueva la sesion sin volver a pedir la contraseña.
 *
 * El refresh token solo trae el id del usuario: el rol y los permisos se leen
 * de la base en este momento. Asi un cambio de rol o un bloqueo surte efecto en
 * la siguiente renovacion (maximo 15 minutos, la vida del access token).
 */
@Injectable()
export class RefreshTokenUseCase implements UseCase<string, SesionIniciada> {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepositoryPort,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuerPort,
  ) {}

  async execute(refreshToken: string): Promise<SesionIniciada> {
    const usuarioId = await this.tokens.verificarRefresh(refreshToken);
    const usuario = await this.usuarios.buscarPorId(usuarioId);

    if (!usuario || usuario.estado !== EstadoUsuario.ACTIVO || !usuario.rol?.activo) {
      throw new UnauthorizedError('La sesion ya no es valida.', 'SESION_INVALIDA');
    }

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
