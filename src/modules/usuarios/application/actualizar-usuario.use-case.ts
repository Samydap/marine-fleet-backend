import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { ConcurrencyError } from '../../../shared/domain/errors/concurrency.error';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import type { RolCodigo } from '../../../shared/domain/rbac/rol.enum';
import {
  asegurarNoEsAutoGestion,
  asegurarPuedeGestionarRol,
  validarBaseSegunRol,
} from '../domain/politica-usuarios';
import type { EstadoUsuario, Usuario } from '../domain/usuario.entity';
import {
  BASE_NAVAL_LOOKUP,
  ROL_REPOSITORY,
  USUARIO_REPOSITORY,
  type BaseNavalLookupPort,
  type RolRepositoryPort,
  type UsuarioRepositoryPort,
} from '../domain/usuario.repository.port';

export interface ActualizarUsuarioInput {
  readonly usuarioId: string;
  readonly version: number;
  readonly nombreCompleto?: string;
  readonly rol?: RolCodigo;
  /** undefined = no cambia; null = quitar base (rol global). */
  readonly baseNavalId?: string | null;
  readonly estado?: EstadoUsuario;
  readonly actorId: string;
  readonly actorPermisos: readonly string[];
}

/**
 * RF-7: cambiar rol, base naval, nombre o estado (activar, inactivar,
 * desbloquear) de una cuenta, con concurrencia optimista por `version`.
 */
@Injectable()
export class ActualizarUsuarioUseCase implements UseCase<ActualizarUsuarioInput, Usuario> {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepositoryPort,
    @Inject(ROL_REPOSITORY) private readonly roles: RolRepositoryPort,
    @Inject(BASE_NAVAL_LOOKUP) private readonly bases: BaseNavalLookupPort,
  ) {}

  async execute(input: ActualizarUsuarioInput): Promise<Usuario> {
    const usuario = await this.usuarios.buscarPorId(input.usuarioId);
    if (!usuario) throw new NotFoundError('usuario', input.usuarioId);
    if (Number(usuario.version) !== Number(input.version)) {
      throw new ConcurrencyError('usuario', input.usuarioId, input.version);
    }

    // Tocar una cuenta de Almirante (o convertir a alguien en Almirante) exige permiso total.
    if (usuario.rol) asegurarPuedeGestionarRol(input.actorPermisos, usuario.rol.codigo);

    if (input.rol !== undefined || input.estado !== undefined) {
      asegurarNoEsAutoGestion(input.actorId, usuario.id);
    }

    if (input.nombreCompleto !== undefined) usuario.nombreCompleto = input.nombreCompleto.trim();
    if (input.rol !== undefined) await this.asignarRol(usuario, input.rol, input.actorPermisos);
    if (input.baseNavalId !== undefined) await this.asignarBase(usuario, input.baseNavalId);

    if (usuario.rol) validarBaseSegunRol(usuario.rol.codigo, usuario.baseNavalId);
    if (input.estado !== undefined) usuario.cambiarEstado(input.estado);

    const rol = usuario.rol;
    const guardado = await this.usuarios.guardar(usuario);
    guardado.rol = rol;
    return guardado;
  }

  private async asignarRol(
    usuario: Usuario,
    codigo: RolCodigo,
    actorPermisos: readonly string[],
  ): Promise<void> {
    asegurarPuedeGestionarRol(actorPermisos, codigo);
    const rol = await this.roles.buscarPorCodigo(codigo);
    if (!rol || !rol.activo) {
      throw new DomainError(`El rol ${codigo} no existe o esta inactivo.`, 'ROL_INVALIDO');
    }
    usuario.rolId = rol.id;
    usuario.rol = rol;
  }

  private async asignarBase(usuario: Usuario, baseNavalId: string | null): Promise<void> {
    if (baseNavalId && !(await this.bases.existeActiva(baseNavalId))) {
      throw new DomainError('La base naval no existe o esta inactiva.', 'BASE_INVALIDA');
    }
    usuario.baseNavalId = baseNavalId;
  }
}
