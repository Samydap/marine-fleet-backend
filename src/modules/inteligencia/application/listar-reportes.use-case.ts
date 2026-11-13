import { Inject, Injectable } from '@nestjs/common';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { UseCase } from '../../../shared/application/use-case.interface';
import type { ReporteCiudadano } from '../domain/reporte-ciudadano.entity';
import {
  REPORTE_CIUDADANO_REPOSITORY,
  type FiltroReportes,
  type ReporteCiudadanoRepositoryPort,
} from '../domain/reporte-ciudadano.repository.port';

/** RF-3. Bandeja de reportes ciudadanos para revisar (por defecto los mas recientes). */
@Injectable()
export class ListarReportesUseCase implements UseCase<
  FiltroReportes,
  PageResult<ReporteCiudadano>
> {
  constructor(
    @Inject(REPORTE_CIUDADANO_REPOSITORY) private readonly reportes: ReporteCiudadanoRepositoryPort,
  ) {}

  execute(filtro: FiltroReportes): Promise<PageResult<ReporteCiudadano>> {
    return this.reportes.listar(filtro);
  }
}
