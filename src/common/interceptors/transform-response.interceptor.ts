import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { SSE_METADATA } from '@nestjs/common/constants';
import { map, type Observable } from 'rxjs';
import { PageResult } from '../../shared/application/pagination/page-result';

export interface RespuestaApi<T> {
  readonly success: true;
  readonly data: T;
  readonly meta?: Record<string, unknown>;
}

/**
 * Envuelve toda respuesta en una forma unica { success, data, meta }.
 * El contrato unico evita que cada dev invente su propio sobre y que el
 * frontend tenga que manejar cinco formas distintas de respuesta.
 */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, RespuestaApi<unknown>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<RespuestaApi<unknown>> {
    // Los streams SSE (@Sse) no se envuelven: cada MessageEvent debe salir tal
    // cual para que el navegador respete `event:` e `id:`.
    if (Reflect.getMetadata(SSE_METADATA, context.getHandler()) === true) {
      return next.handle() as unknown as Observable<RespuestaApi<unknown>>;
    }

    return next.handle().pipe(
      map((payload) => {
        if (payload instanceof PageResult) {
          return { success: true as const, data: payload.data, meta: { ...payload.meta } };
        }
        return { success: true as const, data: payload };
      }),
    );
  }
}
