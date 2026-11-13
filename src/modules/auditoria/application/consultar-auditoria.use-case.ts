import { Inject, Injectable } from '@nestjs/common';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import type { Auditoria } from '../domain/auditoria.entity';
import {
  AUDITORIA_REPOSITORY,
  type AuditoriaRepositoryPort,
  type FiltroAuditoria,
} from '../domain/auditoria.repository.port';

/**
 * RF: "El sistema debe permitir a los roles autorizados consultar la bitacora
 * de auditoria, indicando usuario, accion realizada y fecha."
 *
 * Solo lectura. La autorizacion (AUDITORIA_LEER) la decide el guard; aqui solo
 * se valida que el rango de fechas tenga sentido.
 */
@Injectable()
export class ConsultarAuditoriaUseCase implements UseCase<FiltroAuditoria, PageResult<Auditoria>> {
  constructor(
    @Inject(AUDITORIA_REPOSITORY) private readonly repositorio: AuditoriaRepositoryPort,
  ) {}

  execute(filtro: FiltroAuditoria): Promise<PageResult<Auditoria>> {
    if (filtro.desde && filtro.hasta && filtro.desde > filtro.hasta) {
      throw new DomainError(
        'La fecha "desde" no puede ser posterior a "hasta".',
        'RANGO_FECHAS_INVALIDO',
      );
    }
    return this.repositorio.listar(filtro);
  }
}
