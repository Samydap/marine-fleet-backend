import type { Usuario } from './usuario.entity';

export const USUARIO_REPOSITORY = Symbol('USUARIO_REPOSITORY');

export interface UsuarioRepositoryPort {
  buscarPorId(id: string): Promise<Usuario | null>;
  /** Incluye password_hash y el secreto MFA: solo para el flujo de login. */
  buscarPorEmailConCredenciales(email: string): Promise<Usuario | null>;
  listar(): Promise<Usuario[]>;
  guardar(usuario: Usuario): Promise<Usuario>;
}
