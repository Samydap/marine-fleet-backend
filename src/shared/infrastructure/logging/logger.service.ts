import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';

/**
 * Logger de la aplicacion. Centralizado para poder cambiar el transporte
 * (consola, archivo, agregador) sin tocar los modulos.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger extends ConsoleLogger {
  auditoria(mensaje: string, datos: Record<string, unknown>): void {
    super.log(`[AUDIT] ${mensaje} ${JSON.stringify(datos)}`);
  }
}
