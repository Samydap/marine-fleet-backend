import type { Permiso } from './permiso.enum';
import type { RolCodigo } from './rol.enum';

/** Payload que viaja en el access token y que los guards leen de `request.user`. */
export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly rol: RolCodigo;
  readonly permisos: readonly Permiso[];
  /** Null para roles globales (Almirante, Director de Inteligencia). */
  readonly baseNavalId: string | null;
}

export interface JwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly rol: RolCodigo;
  readonly permisos: readonly Permiso[];
  readonly baseNavalId: string | null;
  readonly iat?: number;
  readonly exp?: number;
}
