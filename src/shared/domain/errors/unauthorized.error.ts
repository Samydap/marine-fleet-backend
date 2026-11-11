import { DomainError } from './domain.error';

/**
 * Fallo de autenticacion: credenciales o sesion no validas. El filtro global lo
 * traduce a 401. Distinto de ForbiddenError (403), que es "se quien eres pero
 * no puedes hacer esto".
 */
export class UnauthorizedError extends DomainError {
  constructor(message = 'Credenciales no validas.', codigo = 'NO_AUTENTICADO') {
    super(message, codigo);
  }
}
