import { Inject, Injectable } from '@nestjs/common';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import type { Rol } from '../domain/rol.entity';
import type { Usuario } from '../domain/usuario.entity';
import {
  ROL_REPOSITORY,
  USUARIO_REPOSITORY,
  type FiltroUsuarios,
  type RolRepositoryPort,
  type UsuarioRepositoryPort,
} from '../domain/usuario.repository.port';

@Injectable()
export class ListarUsuariosUseCase implements UseCase<FiltroUsuarios, PageResult<Usuario>> {
  constructor(@Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepositoryPort) {}

  execute(filtro: FiltroUsuarios): Promise<PageResult<Usuario>> {
    return this.usuarios.buscar(filtro);
  }
}

@Injectable()
export class ObtenerUsuarioUseCase implements UseCase<string, Usuario> {
  constructor(@Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepositoryPort) {}

  async execute(id: string): Promise<Usuario> {
    const usuario = await this.usuarios.buscarPorId(id);
    if (!usuario) throw new NotFoundError('usuario', id);
    return usuario;
  }
}

/** Catalogo de roles con su matriz de permisos (lo usa el formulario de alta). */
@Injectable()
export class ListarRolesUseCase {
  constructor(@Inject(ROL_REPOSITORY) private readonly roles: RolRepositoryPort) {}

  execute(): Promise<Rol[]> {
    return this.roles.listar();
  }
}
