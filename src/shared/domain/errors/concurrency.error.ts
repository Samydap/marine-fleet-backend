import { DomainError } from './domain.error';

/**
 * Choque de concurrencia optimista: la columna `version` del registro cambio
 * entre la lectura y la escritura. El cliente debe recargar y reintentar.
 */
export class ConcurrencyError extends DomainError {
  constructor(recurso: string, id: string, versionEsperada: number) {
    super(
      `El registro ${recurso} ${id} fue modificado por otro usuario. Recarga y vuelve a intentar.`,
      'CONFLICTO_CONCURRENCIA',
      { recurso, id, versionEsperada },
    );
  }
}
