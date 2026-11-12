import { Inject, Injectable } from '@nestjs/common';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { UseCase } from '../../../shared/application/use-case.interface';
import type { Operativo } from '../domain/operativo.entity';
import {
  OPERATIVO_REPOSITORY,
  type FiltroOperativos,
  type OperativoRepositoryPort,
} from '../domain/operativo.repository.port';
import { alcanceDe, type UsuarioOperativo } from './operativo-helpers';

export interface TableroInput {
  readonly filtro: Omit<FiltroOperativos, 'alcanceBaseId'>;
  readonly usuario: UsuarioOperativo;
}

/**
 * RF-4 "planeacion y seguimiento de misiones de captura": tablero filtrable por
 * estado, prioridad, base y criminal. El alcance lo impone el caso de uso, no el
 * cliente: un usuario con base asignada solo ve los operativos de su base.
 */
@Injectable()
export class TableroOperativosUseCase implements UseCase<TableroInput, PageResult<Operativo>> {
  constructor(@Inject(OPERATIVO_REPOSITORY) private readonly operativos: OperativoRepositoryPort) {}

  execute(input: TableroInput): Promise<PageResult<Operativo>> {
    return this.operativos.listar({ ...input.filtro, alcanceBaseId: alcanceDe(input.usuario) });
  }
}
