import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CRIMINAL_READER,
  type CriminalReaderPort,
} from '../../criminales/domain/criminal.repository.port';
import { ClasificarCriminalUseCase } from './clasificar-criminal.use-case';

export interface ResumenReclasificacion {
  readonly total: number;
  readonly reclasificados: number;
  readonly sinCambio: number;
  readonly errores: Array<{ criminalId: string; mensaje: string }>;
  readonly duracionMs: number;
}

/**
 * RF-5. Vuelve a clasificar a TODOS los criminales. Se usa al cambiar los
 * criterios: un umbral nuevo afecta a criminales cuya recompensa no cambio.
 *
 * Secuencial a proposito: con cientos de registros es rapido, y no satura el
 * pool de conexiones (10) que comparte con las peticiones de los usuarios.
 * Un fallo en un criminal no detiene el resto: se reporta en `errores`.
 */
@Injectable()
export class ReclasificarMasivoUseCase {
  private readonly logger = new Logger(ReclasificarMasivoUseCase.name);

  constructor(
    @Inject(CRIMINAL_READER) private readonly criminales: CriminalReaderPort,
    private readonly clasificar: ClasificarCriminalUseCase,
  ) {}

  async execute(usuarioId: string | null): Promise<ResumenReclasificacion> {
    const inicio = Date.now();
    const ids = await this.criminales.listarTodosLosIds();
    let reclasificados = 0;
    const errores: Array<{ criminalId: string; mensaje: string }> = [];

    for (const criminalId of ids) {
      try {
        const resultado = await this.clasificar.execute({ criminalId, usuarioId });
        if (resultado.cambio) reclasificados += 1;
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : String(error);
        errores.push({ criminalId, mensaje });
        this.logger.warn(`No se pudo reclasificar ${criminalId}: ${mensaje}`);
      }
    }

    return {
      total: ids.length,
      reclasificados,
      sinCambio: ids.length - reclasificados - errores.length,
      errores,
      duracionMs: Date.now() - inicio,
    };
  }
}
