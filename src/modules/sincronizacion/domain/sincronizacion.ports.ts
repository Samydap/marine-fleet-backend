import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { AuthenticatedUser } from '../../../shared/domain/rbac/authenticated-user';
import type { Notificacion } from './notificacion.entity';

export const NOTIFICACION_REPOSITORY = Symbol('NOTIFICACION_REPOSITORY');

export interface FiltroNotificaciones {
  /** null = sin limite de base (rol global). */
  readonly baseNavalId: string | null;
  readonly soloNoLeidas: boolean;
  readonly page: number;
  readonly limit: number;
}

export interface NotificacionRepositoryPort {
  guardarVarias(notificaciones: Notificacion[]): Promise<void>;
  buscarPorId(id: string): Promise<Notificacion | null>;
  listar(filtro: FiltroNotificaciones): Promise<PageResult<Notificacion>>;
  guardar(notificacion: Notificacion): Promise<Notificacion>;
}

/**
 * Verifica el access token que llega por query string al canal SSE (el
 * EventSource del navegador no puede enviar el header Authorization).
 */
export const VERIFICADOR_SESION = Symbol('VERIFICADOR_SESION');

export interface VerificadorSesionPort {
  /** Sincrono a proposito: el canal SSE debe rechazar con 401 antes de abrirse. */
  verificar(token: string): AuthenticatedUser;
}

/** Chequeo de salud de la infraestructura (RNF de disponibilidad del 99 %). */
export const SALUD_PORT = Symbol('SALUD_PORT');

export interface SaludPort {
  /** Latencia de un ping a la base en ms; lanza si la base no responde. */
  pingBaseDeDatos(): Promise<number>;
}
