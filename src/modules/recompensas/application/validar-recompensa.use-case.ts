import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import {
  CRIMINAL_READER,
  type CriminalReaderPort,
} from '../../criminales/domain/criminal.repository.port';
import { EstadoCriminal } from '../../criminales/domain/estado-criminal.enum';
import { asegurarPuedeValidar } from '../domain/politica-validacion';
import type { Recompensa } from '../domain/recompensa.entity';
import {
  RECOMPENSA_REPOSITORY,
  type RecompensaRepositoryPort,
} from '../domain/recompensa.repository.port';
import { ActivarRecompensaService } from './activar-recompensa.service';

export interface ValidarRecompensaInput {
  readonly recompensaId: string;
  readonly aprobar: boolean;
  readonly motivo?: string;
  readonly usuarioId: string;
  readonly permisos: readonly string[];
}

/**
 * RF-1 "solicitar y VALIDAR recompensas de alto rango por parte del Almirante".
 *
 * La autorizacion se revisa dos veces a proposito: el controller exige el
 * permiso RECOMPENSAS_VALIDAR y el dominio lo vuelve a exigir con
 * asegurarPuedeValidar(). Si manana otro adaptador (una cola, un CLI) invoca
 * este caso de uso, la regla sigue protegida.
 *
 * Segregacion de funciones: quien solicito la recompensa no puede aprobarla.
 */
@Injectable()
export class ValidarRecompensaUseCase implements UseCase<ValidarRecompensaInput, Recompensa> {
  constructor(
    @Inject(RECOMPENSA_REPOSITORY) private readonly recompensas: RecompensaRepositoryPort,
    private readonly activador: ActivarRecompensaService,
    @Inject(CRIMINAL_READER) private readonly criminales: CriminalReaderPort,
  ) {}

  async execute(input: ValidarRecompensaInput): Promise<Recompensa> {
    asegurarPuedeValidar(input.permisos);

    const recompensa = await this.recompensas.buscarPorId(input.recompensaId);
    if (!recompensa) throw new NotFoundError('recompensa', input.recompensaId);

    if (recompensa.solicitadaPor === input.usuarioId) {
      throw new DomainError(
        'Quien solicita una recompensa no puede validarla.',
        'AUTOVALIDACION_NO_PERMITIDA',
      );
    }

    if (input.aprobar) {
      // Entre la solicitud y la firma el criminal pudo ser capturado o abatido.
      const criminal = await this.criminales.obtenerResumen(recompensa.criminalId);
      if (!criminal || criminal.estado !== EstadoCriminal.ACTIVO) {
        throw new DomainError(
          'El criminal ya no esta activo: rechaza la recompensa en lugar de aprobarla.',
          'CRIMINAL_NO_ACTIVO',
        );
      }
      recompensa.activar(input.usuarioId);
      await this.activador.activar(recompensa, input.usuarioId);
      return recompensa;
    }

    if (!input.motivo?.trim()) {
      throw new DomainError('Rechazar una recompensa exige un motivo.', 'MOTIVO_REQUERIDO');
    }
    recompensa.rechazar(input.usuarioId, input.motivo.trim());
    return this.recompensas.guardar(recompensa);
  }
}
