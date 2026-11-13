import { Injectable } from '@nestjs/common';
import { Subject, filter, type Observable } from 'rxjs';
import type { AuthenticatedUser } from '../../../shared/domain/rbac/authenticated-user';
import { esVisiblePara, type CambioSincronizado } from '../domain/cambio-sincronizado';

/** Cuantos cambios recientes se guardan para quien se reconecta o consulta por polling. */
export const CAPACIDAD_BUFFER = 500;

/**
 * Canal en memoria por el que fluyen todos los hechos del sistema hacia las
 * bases conectadas (SSE) y hacia el polling de respaldo.
 *
 * Es la pieza que cumple el RNF "el estado de un operativo se refleja ... maximo
 * 15 segundos para todos los usuarios": en cuanto un caso de uso publica su
 * evento, el cambio sale por este Subject a cada navegador conectado, sin que
 * nadie tenga que recargar.
 *
 * Limite conocido: vive en la memoria de UNA instancia del API. Con varias
 * instancias se sustituye el Subject por Redis Pub/Sub sin tocar los oyentes.
 */
@Injectable()
export class CanalSincronizacion {
  private readonly flujo = new Subject<CambioSincronizado>();
  private readonly recientes: CambioSincronizado[] = [];
  private consecutivo = 0;

  publicar(evento: string, datos: unknown): CambioSincronizado {
    const cambio: CambioSincronizado = {
      id: ++this.consecutivo,
      evento,
      datos,
      fecha: new Date().toISOString(),
    };
    this.recientes.push(cambio);
    if (this.recientes.length > CAPACIDAD_BUFFER) this.recientes.shift();
    this.flujo.next(cambio);
    return cambio;
  }

  /** Flujo en vivo, ya filtrado para lo que el usuario puede ver. */
  flujoPara(
    usuario: Pick<AuthenticatedUser, 'permisos' | 'baseNavalId'>,
  ): Observable<CambioSincronizado> {
    return this.flujo.asObservable().pipe(filter((cambio) => esVisiblePara(cambio, usuario)));
  }

  /**
   * Cambios recientes posteriores a una fecha o a un consecutivo (lo que llegue).
   * Es el polling de respaldo para clientes sin SSE y la reanudacion tras un corte.
   */
  cambiosDesde(
    usuario: Pick<AuthenticatedUser, 'permisos' | 'baseNavalId'>,
    criterio: { desde?: Date; despuesDeId?: number },
  ): CambioSincronizado[] {
    return this.recientes.filter(
      (cambio) =>
        (criterio.despuesDeId === undefined || cambio.id > criterio.despuesDeId) &&
        (criterio.desde === undefined || new Date(cambio.fecha) > criterio.desde) &&
        esVisiblePara(cambio, usuario),
    );
  }

  ultimoId(): number {
    return this.consecutivo;
  }
}
