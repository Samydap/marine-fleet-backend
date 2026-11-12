import { DomainError } from '../../../shared/domain/errors/domain.error';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import { Permiso, tienePermiso } from '../../../shared/domain/rbac/permiso.enum';
import { RolCodigo } from '../../../shared/domain/rbac/rol.enum';

/**
 * RF-7. Reglas de administracion de usuarios. Funciones puras: se prueban sin
 * base de datos ni HTTP.
 */

/** Politica de contraseñas: 8+ caracteres con mayuscula, minuscula y numero. */
export function validarPoliticaContrasena(password: string): void {
  const fallos: string[] = [];
  if (password.length < 8) fallos.push('al menos 8 caracteres');
  if (!/[A-Z]/.test(password)) fallos.push('una mayuscula');
  if (!/[a-z]/.test(password)) fallos.push('una minuscula');
  if (!/\d/.test(password)) fallos.push('un numero');

  if (fallos.length > 0) {
    throw new DomainError(`La contraseña debe tener ${fallos.join(', ')}.`, 'CONTRASENA_DEBIL', {
      requisitos: fallos,
    });
  }
}

/** Roles que operan sobre una base concreta: exigen base naval asignada. */
const ROLES_CON_BASE: readonly RolCodigo[] = [RolCodigo.CAPITAN];

export function validarBaseSegunRol(rol: RolCodigo, baseNavalId: string | null): void {
  if (ROLES_CON_BASE.includes(rol) && !baseNavalId) {
    throw new DomainError(`El rol ${rol} requiere una base naval asignada.`, 'BASE_REQUERIDA');
  }
}

/**
 * Solo quien tiene el permiso total (el Almirante) puede crear o tocar cuentas
 * de Almirante: impide que un administrador de usuarios se fabrique un superusuario.
 */
export function asegurarPuedeGestionarRol(permisosActor: readonly string[], rol: RolCodigo): void {
  if (rol === RolCodigo.ALMIRANTE && !tienePermiso(permisosActor, Permiso.TODO)) {
    throw new ForbiddenError('gestionar cuentas con rol de Almirante');
  }
}

/** Nadie se cambia a si mismo el rol o el estado: evita bloqueos y escaladas. */
export function asegurarNoEsAutoGestion(actorId: string, usuarioId: string): void {
  if (actorId === usuarioId) {
    throw new DomainError(
      'No puedes cambiar tu propio rol o estado. Pide a otro administrador.',
      'AUTO_GESTION_NO_PERMITIDA',
    );
  }
}
