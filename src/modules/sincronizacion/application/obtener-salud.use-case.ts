import { Inject, Injectable } from '@nestjs/common';
import type { QueryUseCase } from '../../../shared/application/use-case.interface';
import { SALUD_PORT, type SaludPort } from '../domain/sincronizacion.ports';

export interface EstadoSalud {
  readonly estado: 'OK' | 'DEGRADADO';
  readonly baseDeDatos: { readonly disponible: boolean; readonly latenciaMs: number | null };
  readonly tiempoActivoSegundos: number;
  readonly fecha: string;
}

/**
 * RNF "disponibilidad minima del 99 % mensual". El sistema no puede garantizar
 * su propia disponibilidad, pero si exponer un punto que un monitor externo
 * (UptimeRobot, el balanceador) consulte cada minuto para medirla y alertar.
 */
@Injectable()
export class ObtenerSaludUseCase implements QueryUseCase<EstadoSalud> {
  constructor(@Inject(SALUD_PORT) private readonly salud: SaludPort) {}

  async execute(): Promise<EstadoSalud> {
    let latenciaMs: number | null = null;
    try {
      latenciaMs = await this.salud.pingBaseDeDatos();
    } catch {
      latenciaMs = null;
    }

    return {
      estado: latenciaMs === null ? 'DEGRADADO' : 'OK',
      baseDeDatos: { disponible: latenciaMs !== null, latenciaMs },
      tiempoActivoSegundos: Math.round(process.uptime()),
      fecha: new Date().toISOString(),
    };
  }
}
