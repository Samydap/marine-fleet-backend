import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit:accion';

/**
 * Marca una accion para que el AuditInterceptor la registre en la bitacora.
 * Exigido por RF-7: toda escritura sensible debe quedar trazada.
 * @example @Audit('VALIDAR_RECOMPENSA')
 */
export const Audit = (accion: string): MethodDecorator => SetMetadata(AUDIT_KEY, accion);
