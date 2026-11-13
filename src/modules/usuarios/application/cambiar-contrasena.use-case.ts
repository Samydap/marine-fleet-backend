import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error';
import { PASSWORD_HASHER, type PasswordHasherPort } from '../../auth/domain/password-hasher.port';
import { asegurarPuedeGestionarRol, validarPoliticaContrasena } from '../domain/politica-usuarios';
import { USUARIO_REPOSITORY, type UsuarioRepositoryPort } from '../domain/usuario.repository.port';

export interface CambiarContrasenaInput {
  readonly usuarioId: string;
  readonly nuevaPassword: string;
  /** Obligatoria cuando el usuario cambia SU contraseña; omitida en el restablecimiento por admin. */
  readonly passwordActual?: string;
  /** Permisos de quien restablece (solo en el flujo de administrador). */
  readonly actorPermisos?: readonly string[];
}

/**
 * Dos flujos con la misma regla de politica:
 *  - el usuario cambia su propia contraseña (exige la actual);
 *  - un administrador la restablece (no la conoce, pero no puede tocar Almirantes).
 */
@Injectable()
export class CambiarContrasenaUseCase implements UseCase<CambiarContrasenaInput, void> {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(input: CambiarContrasenaInput): Promise<void> {
    const usuario = await this.usuarios.buscarPorIdConCredenciales(input.usuarioId);
    if (!usuario) throw new NotFoundError('usuario', input.usuarioId);

    if (input.passwordActual !== undefined) {
      const coincide = await this.hasher.comparar(input.passwordActual, usuario.passwordHash);
      if (!coincide) {
        throw new UnauthorizedError(
          'La contraseña actual no es correcta.',
          'CONTRASENA_ACTUAL_INVALIDA',
        );
      }
    } else if (usuario.rol) {
      asegurarPuedeGestionarRol(input.actorPermisos ?? [], usuario.rol.codigo);
    }

    validarPoliticaContrasena(input.nuevaPassword);
    usuario.passwordHash = await this.hasher.hash(input.nuevaPassword);
    await this.usuarios.guardar(usuario);
  }
}
