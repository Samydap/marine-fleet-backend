import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { RolCodigo } from '../../../shared/domain/rbac/rol.enum';
import type { Rol } from './rol.entity';
import type { EstadoUsuario, Usuario } from './usuario.entity';

export const USUARIO_REPOSITORY = Symbol('USUARIO_REPOSITORY');

export interface FiltroUsuarios {
  readonly q?: string;
  readonly rol?: RolCodigo;
  readonly baseNavalId?: string;
  readonly estado?: EstadoUsuario;
  readonly page: number;
  readonly limit: number;
  readonly order: 'ASC' | 'DESC';
}

export interface UsuarioRepositoryPort {
  buscarPorId(id: string): Promise<Usuario | null>;
  /** Incluye password_hash y el secreto MFA: solo para el flujo de login. */
  buscarPorEmailConCredenciales(email: string): Promise<Usuario | null>;
  /** Igual que buscarPorId pero con password_hash: cambio de contraseña. */
  buscarPorIdConCredenciales(id: string): Promise<Usuario | null>;
  listar(): Promise<Usuario[]>;
  buscar(filtro: FiltroUsuarios): Promise<PageResult<Usuario>>;
  existeEmail(email: string): Promise<boolean>;
  guardar(usuario: Usuario): Promise<Usuario>;
}

export const ROL_REPOSITORY = Symbol('ROL_REPOSITORY');

export interface RolRepositoryPort {
  listar(): Promise<Rol[]>;
  buscarPorCodigo(codigo: RolCodigo): Promise<Rol | null>;
}

/** Validacion de la base naval sin depender del modulo de catalogos. */
export const BASE_NAVAL_LOOKUP = Symbol('BASE_NAVAL_LOOKUP');

export interface BaseNavalLookupPort {
  existeActiva(baseNavalId: string): Promise<boolean>;
}
