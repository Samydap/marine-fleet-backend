import { SetMetadata } from '@nestjs/common';
import type { TipoAccionAuditoria } from '../../shared/domain/auditoria/auditoria.port';

export const AUDIT_KEY = 'audit:accion';

export type { TipoAccionAuditoria };

export interface MetadataAuditoria {
  readonly accion: string;
  /** Entidad afectada (`criminal`, `recompensa`, `operativo`...). */
  readonly entidad?: string;
  readonly tipo?: TipoAccionAuditoria;
}

/**
 * Marca una accion para que el AuditInterceptor la registre en la tabla
 * `auditoria`. Exigido por RF-7: toda escritura sensible debe quedar trazada.
 *
 * El interceptor toma el id afectado de `:id` en la ruta o, si no hay, del
 * `id` de la respuesta (caso de las creaciones).
 *
 * @example @Audit('VALIDAR_RECOMPENSA', { entidad: 'recompensa', tipo: 'ACTUALIZACION' })
 */
export const Audit = (
  accion: string,
  opciones: Omit<MetadataAuditoria, 'accion'> = {},
): MethodDecorator => SetMetadata(AUDIT_KEY, { accion, ...opciones } satisfies MetadataAuditoria);
