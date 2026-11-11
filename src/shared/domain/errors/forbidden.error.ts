import { DomainError } from './domain.error';

export class ForbiddenError extends DomainError {
  constructor(accion: string) {
    super(`Tu rol no tiene autorizacion para ${accion}.`, 'NO_AUTORIZADO', { accion });
  }
}
