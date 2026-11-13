import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import type { ResultadoOperativo } from '../domain/estado-operativo.enum';
import type { Operativo } from '../domain/operativo.entity';
import {
  OPERATIVO_REPOSITORY,
  type OperativoRepositoryPort,
} from '../domain/operativo.repository.port';
import {
  cargarOperativo,
  eventoOperativo,
  verificarVersion,
  type UsuarioOperativo,
} from './operativo-helpers';

export interface CerrarOperativoInput {
  readonly operativoId: string;
  readonly resultado: ResultadoOperativo;
  readonly observaciones?: string;
  readonly version: number;
  readonly usuario: UsuarioOperativo;
}

/**
 * RF-4 "cerrar un operativo registrando su resultado final y observaciones".
 * Solo se cierra un operativo EN_CURSO (la entidad valida la transicion). El
 * estado de los criminales NO cambia aqui: eso lo decide el cierre de cada
 * enfrentamiento (modulo Incidentes), que es donde consta quien fue capturado.
 */
@Injectable()
export class CerrarOperativoUseCase implements UseCase<CerrarOperativoInput, Operativo> {
  constructor(
    @Inject(OPERATIVO_REPOSITORY) private readonly operativos: OperativoRepositoryPort,
    private readonly eventos: EventEmitter2,
  ) {}

  async execute(input: CerrarOperativoInput): Promise<Operativo> {
    const operativo = await cargarOperativo(this.operativos, input.operativoId, input.usuario);
    verificarVersion(operativo, input.version);

    operativo.cerrar(input.resultado, input.observaciones?.trim() || null);
    const guardado = await this.operativos.guardar(operativo);

    this.eventos.emit(
      EVENTOS.OPERATIVO_ACTUALIZADO,
      eventoOperativo(guardado, 'CERRADO', input.usuario.id),
    );
    return guardado;
  }
}
