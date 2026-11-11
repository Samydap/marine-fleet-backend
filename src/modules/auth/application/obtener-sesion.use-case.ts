import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error';
import { EstadoUsuario, type Usuario } from '../../usuarios/domain/usuario.entity';
import {
  USUARIO_REPOSITORY,
  type UsuarioRepositoryPort,
} from '../../usuarios/domain/usuario.repository.port';

/**
 * Devuelve el usuario de la sesion actual leyendolo de la base, no del token:
 * asi el frontend recibe los permisos vigentes aunque el rol haya cambiado
 * despues de emitir el token, y una cuenta bloqueada deja de tener sesion.
 *
 * Lo usa el frontend para rehidratar la sesion al recargar la pagina.
 */
@Injectable()
export class ObtenerSesionUseCase implements UseCase<string, Usuario> {
  constructor(@Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepositoryPort) {}

  async execute(usuarioId: string): Promise<Usuario> {
    const usuario = await this.usuarios.buscarPorId(usuarioId);

    if (!usuario || usuario.estado !== EstadoUsuario.ACTIVO || !usuario.rol?.activo) {
      throw new UnauthorizedError('La sesion ya no es valida.', 'SESION_INVALIDA');
    }

    return usuario;
  }
}
