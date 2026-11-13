import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import type { RolCodigo } from '../../../shared/domain/rbac/rol.enum';
import { PASSWORD_HASHER, type PasswordHasherPort } from '../../auth/domain/password-hasher.port';
import {
  asegurarPuedeGestionarRol,
  validarBaseSegunRol,
  validarPoliticaContrasena,
} from '../domain/politica-usuarios';
import { EstadoUsuario, Usuario } from '../domain/usuario.entity';
import {
  BASE_NAVAL_LOOKUP,
  ROL_REPOSITORY,
  USUARIO_REPOSITORY,
  type BaseNavalLookupPort,
  type RolRepositoryPort,
  type UsuarioRepositoryPort,
} from '../domain/usuario.repository.port';

export interface CrearUsuarioInput {
  readonly nombreCompleto: string;
  readonly email: string;
  readonly password: string;
  readonly rol: RolCodigo;
  readonly baseNavalId: string | null;
  readonly actorPermisos: readonly string[];
}

/**
 * RF: "registro/autenticacion de usuarios con roles diferenciados" y "asociar
 * cada usuario a la base naval donde presta servicio".
 *
 * La contraseña se guarda SOLO como hash bcrypt (RNF: nunca en texto plano).
 */
@Injectable()
export class CrearUsuarioUseCase implements UseCase<CrearUsuarioInput, Usuario> {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepositoryPort,
    @Inject(ROL_REPOSITORY) private readonly roles: RolRepositoryPort,
    @Inject(BASE_NAVAL_LOOKUP) private readonly bases: BaseNavalLookupPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(input: CrearUsuarioInput): Promise<Usuario> {
    const email = input.email.trim().toLowerCase();

    asegurarPuedeGestionarRol(input.actorPermisos, input.rol);
    validarPoliticaContrasena(input.password);
    validarBaseSegunRol(input.rol, input.baseNavalId);

    if (await this.usuarios.existeEmail(email)) {
      throw new DomainError('Ya existe un usuario con ese correo.', 'EMAIL_DUPLICADO');
    }

    const rol = await this.roles.buscarPorCodigo(input.rol);
    if (!rol || !rol.activo) {
      throw new DomainError(`El rol ${input.rol} no existe o esta inactivo.`, 'ROL_INVALIDO');
    }

    if (input.baseNavalId && !(await this.bases.existeActiva(input.baseNavalId))) {
      throw new DomainError('La base naval no existe o esta inactiva.', 'BASE_INVALIDA');
    }

    const usuario = new Usuario();
    usuario.id = randomUUID();
    usuario.nombreCompleto = input.nombreCompleto.trim();
    usuario.email = email;
    usuario.passwordHash = await this.hasher.hash(input.password);
    usuario.rolId = rol.id;
    usuario.rol = rol;
    usuario.baseNavalId = input.baseNavalId;
    usuario.estado = EstadoUsuario.ACTIVO;
    usuario.mfaHabilitado = false;
    usuario.mfaSecretoCifrado = null;
    usuario.intentosFallidos = 0;
    usuario.ultimoAcceso = null;

    const guardado = await this.usuarios.guardar(usuario);
    guardado.rol = rol;
    return guardado;
  }
}
