/**
 * Error de regla de negocio. El filtro global lo traduce a 4xx; cualquier otro
 * error se traduce a 500 sin filtrar detalles al cliente.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly codigo = 'REGLA_NEGOCIO',
    readonly detalles?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}
