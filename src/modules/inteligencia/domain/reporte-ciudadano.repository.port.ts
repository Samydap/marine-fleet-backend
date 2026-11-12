import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { Avistamiento } from './avistamiento.entity';
import type { EstadoReporte, ReporteCiudadano } from './reporte-ciudadano.entity';

export const REPORTE_CIUDADANO_REPOSITORY = Symbol('REPORTE_CIUDADANO_REPOSITORY');

export interface FiltroReportes {
  readonly estado?: EstadoReporte;
  readonly criminalId?: string;
  readonly zonaInfluenciaId?: string;
  readonly page: number;
  readonly limit: number;
  readonly order: 'ASC' | 'DESC';
}

export interface ReporteCiudadanoRepositoryPort {
  buscarPorId(id: string): Promise<ReporteCiudadano | null>;
  listar(filtro: FiltroReportes): Promise<PageResult<ReporteCiudadano>>;
  guardar(reporte: ReporteCiudadano): Promise<ReporteCiudadano>;
  /**
   * Aprobar es atomico: el avistamiento oficial y el reporte que lo origino se
   * guardan en la misma transaccion. Nunca queda un reporte APROBADO sin su
   * avistamiento, ni un avistamiento huerfano.
   */
  aprobarConAvistamiento(reporte: ReporteCiudadano, avistamiento: Avistamiento): Promise<void>;
}
