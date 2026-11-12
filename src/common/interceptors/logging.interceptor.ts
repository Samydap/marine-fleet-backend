import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { tap, type Observable } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method } = request;
    // El SSE recibe el token por query string: nunca debe quedar en los logs.
    const url = request.url.replace(/([?&]token=)[^&]*/i, '$1***');
    const inicio = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.logger.log(`${method} ${url} - ${Date.now() - inicio}ms`),
        error: (error: Error) =>
          this.logger.warn(`${method} ${url} - ${Date.now() - inicio}ms - ${error.message}`),
      }),
    );
  }
}
