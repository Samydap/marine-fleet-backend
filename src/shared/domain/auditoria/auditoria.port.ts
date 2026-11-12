/** Columna `auditoria.tipo_accion` (clase Auditoria del diagrama). */
export type TipoAccionAuditoria =
  'CREACION' | 'ACTUALIZACION' | 'ELIMINACION_LOGICA' | 'CONSULTA' | 'AUTENTICACION';

export const AUDITORIA_WRITER = Symbol('AUDITORIA_WRITER');

export interface RegistroAuditoria {
  readonly usuarioId: string | null;
  readonly rol: string | null;
  readonly accion: string;
  readonly tipoAccion: TipoAccionAuditoria;
  readonly entidad: string | null;
  readonly entidadId: string | null;
  readonly valorAnterior?: unknown;
  readonly valorNuevo?: unknown;
  readonly metodo?: string | null;
  readonly ruta?: string | null;
  readonly ip?: string | null;
  readonly exitoso: boolean;
}

/**
 * Escritura en la bitacora de auditoria. La implementa el modulo `auditoria`
 * (global); la usan el AuditInterceptor y cualquier caso de uso que necesite
 * dejar el valor anterior y el nuevo de un cambio critico.
 */
export interface AuditoriaWriterPort {
  registrar(registro: RegistroAuditoria): Promise<void>;
}
