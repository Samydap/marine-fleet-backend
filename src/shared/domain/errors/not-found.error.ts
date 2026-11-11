import { DomainError } from './domain.error';

export class NotFoundError extends DomainError {
  constructor(recurso: string, id: string) {
    super(`No existe ${recurso} con id ${id}.`, 'NO_ENCONTRADO', { recurso, id });
  }
}
