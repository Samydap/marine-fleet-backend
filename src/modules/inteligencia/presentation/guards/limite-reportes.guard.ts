import {
  HttpException,
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

const VENTANA_MS = 60_000;
const MAXIMO_POR_VENTANA = 5;

/**
 * Limite de peticiones por IP para el formulario publico de reportes: maximo 5
 * por minuto. Protege contra spam y contra quien quiera llenar la bandeja de
 * inteligencia con basura.
 *
 * En memoria y por proceso: suficiente para el semestre. Con varias instancias
 * se cambia por @nestjs/throttler con almacenamiento compartido.
 */
@Injectable()
export class LimiteReportesGuard implements CanActivate {
  private readonly accesos = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? request.socket?.remoteAddress ?? 'desconocida';
    const ahora = Date.now();

    const recientes = (this.accesos.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
    if (recientes.length >= MAXIMO_POR_VENTANA) {
      this.accesos.set(ip, recientes);
      throw new HttpException(
        'Demasiados reportes desde esta conexion. Intenta de nuevo en un minuto.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recientes.push(ahora);
    this.accesos.set(ip, recientes);
    this.limpiar(ahora);
    return true;
  }

  /** Evita que el mapa crezca sin limite con IPs que ya no vuelven. */
  private limpiar(ahora: number): void {
    if (this.accesos.size < 10_000) return;
    for (const [ip, tiempos] of this.accesos) {
      if (tiempos.every((t) => ahora - t >= VENTANA_MS)) this.accesos.delete(ip);
    }
  }
}
