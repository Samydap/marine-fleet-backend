import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTOS } from '../../../../shared/domain/events/domain-event';
import type {
  AmenazaReclasificadaEvent,
  CriminalActualizadoEvent,
  CriminalEstadoCambiadoEvent,
  CriminalRegistradoEvent,
  MotivoCambioCriminal,
} from '../../../../shared/domain/events/eventos.contracts';
import { RegenerarPorCambioUseCase } from '../../application/regenerar-por-cambio.use-case';
import { MotivoGeneracion } from '../../domain/cartel.entity';

/**
 * Prioridad cuando un mismo cambio trae varios motivos: se usa el primero de la
 * lista. DATOS (nombre, alias) se imprime, asi que tambien regenera; si el cambio
 * fue en un campo que no sale en el cartel, la idempotencia por instantanea evita
 * la version nueva. ZONA no aparece: no se imprime.
 */
const MOTIVO_POR_CAMBIO: ReadonlyArray<[MotivoCambioCriminal, MotivoGeneracion]> = [
  ['RECOMPENSA', MotivoGeneracion.CAMBIO_RECOMPENSA],
  ['FOTO', MotivoGeneracion.CAMBIO_FOTO],
  ['AFILIACION', MotivoGeneracion.CAMBIO_AFILIACION],
  ['DATOS', MotivoGeneracion.CAMBIO_DATOS],
];

/**
 * RF-2: esto es lo que hace que la generacion del cartel sea AUTOMATICA y no un
 * boton. Carteles no conoce a Criminales, Recompensas ni Amenaza: solo escucha
 * sus eventos. Un fallo aqui se registra y no tumba la operacion que lo origino.
 */
@Injectable()
export class CriminalActualizadoListener {
  private readonly logger = new Logger('CartelesListener');

  constructor(private readonly regenerar: RegenerarPorCambioUseCase) {}

  @OnEvent(EVENTOS.CRIMINAL_REGISTRADO, { async: true, promisify: true })
  alRegistrar(evento: CriminalRegistradoEvent): Promise<void> {
    return this.ejecutar(evento.criminalId, MotivoGeneracion.REGISTRO, evento.usuarioId);
  }

  @OnEvent(EVENTOS.CRIMINAL_ESTADO_CAMBIADO, { async: true, promisify: true })
  alCambiarEstado(evento: CriminalEstadoCambiadoEvent): Promise<void> {
    return this.ejecutar(evento.criminalId, MotivoGeneracion.CAMBIO_ESTADO, evento.usuarioId);
  }

  @OnEvent(EVENTOS.CRIMINAL_ACTUALIZADO, { async: true, promisify: true })
  async alActualizar(evento: CriminalActualizadoEvent): Promise<void> {
    const motivo = MOTIVO_POR_CAMBIO.find(([cambio]) => evento.motivos.includes(cambio))?.[1];
    if (motivo) {
      await this.ejecutar(evento.criminalId, motivo, evento.usuarioId);
    }
  }

  /** El nivel de amenaza se imprime: si cambia, el cartel se actualiza (idempotente). */
  @OnEvent(EVENTOS.AMENAZA_RECLASIFICADA, { async: true, promisify: true })
  alReclasificar(evento: AmenazaReclasificadaEvent): Promise<void> {
    return this.ejecutar(evento.criminalId, MotivoGeneracion.CAMBIO_RECOMPENSA, null);
  }

  private async ejecutar(
    criminalId: string,
    motivo: MotivoGeneracion,
    usuarioId: string | null,
  ): Promise<void> {
    try {
      const resultado = await this.regenerar.execute({ criminalId, motivo, usuarioId });
      if (resultado?.generado) {
        this.logger.log(`Cartel v${resultado.cartel.numeroVersion} de ${criminalId} (${motivo})`);
      }
    } catch (error) {
      this.logger.error(`No se pudo generar el cartel de ${criminalId}`, (error as Error).stack);
    }
  }
}
