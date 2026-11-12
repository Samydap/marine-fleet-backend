import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequierePermisos } from '../../../common/decorators/roles.decorator';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { EstadisticasUseCase } from '../application/estadisticas.use-case';
import {
  ExportarReporteUseCase,
  type ArchivoExportado,
} from '../application/exportar-reporte.use-case';
import {
  HistorialReportesUseCase,
  ReporteRecompensasPorMarUseCase,
} from '../application/reporte-recompensas-por-mar.use-case';
import {
  tablaEstadisticas,
  tablaRecompensasPorMar,
  tablaTendencias,
} from '../application/tablas-reporte';
import { TendenciasUseCase, type Tendencias } from '../application/tendencias.use-case';
import type {
  Estadisticas,
  InstantaneaReporte,
  ReporteRecompensasPorMar,
} from '../domain/reportes.types';
import {
  ExportarPeriodoDto,
  ExportarTendenciasDto,
  FormatoDto,
  PeriodoDto,
  TendenciasDto,
} from './dto/reportes.dto';

/**
 * Envio binario con @Res() (modo libreria): el archivo no pasa por el
 * TransformResponseInterceptor, que lo envolveria en { success, data }.
 */
function enviar(res: Response, archivo: ArchivoExportado): void {
  res.setHeader('Content-Type', archivo.mime);
  res.setHeader('Content-Length', archivo.contenido.length);
  res.setHeader('Content-Disposition', `attachment; filename="${archivo.nombreArchivo}"`);
  res.status(200).send(archivo.contenido);
}

/**
 * Analisis y Reportes. Los endpoints JSON alimentan el dashboard del frontend;
 * los `/exportar` devuelven el mismo reporte como CSV o PDF.
 */
@ApiTags('reportes')
@ApiBearerAuth()
@RequierePermisos(Permiso.REPORTES_LEER)
@Controller({ path: 'reportes', version: '1' })
export class ReportesController {
  constructor(
    private readonly recompensasPorMar: ReporteRecompensasPorMarUseCase,
    private readonly historial: HistorialReportesUseCase,
    private readonly tendencias: TendenciasUseCase,
    private readonly estadisticas: EstadisticasUseCase,
    private readonly exportar: ExportarReporteUseCase,
  ) {}

  @Get('recompensas-por-mar')
  @ApiOperation({ summary: 'Reporte mensual: total en recompensas activas por cada mar' })
  reporteMensual(
    @Query() dto: PeriodoDto,
    @CurrentUser('id') usuarioId: string,
  ): Promise<ReporteRecompensasPorMar> {
    return this.recompensasPorMar.execute({ periodo: dto.periodo, usuarioId });
  }

  @Get('recompensas-por-mar/exportar')
  @ApiProduces('application/pdf', 'text/csv')
  @ApiOperation({ summary: 'Exporta el reporte mensual por mar en PDF o CSV' })
  async exportarMensual(
    @Query() dto: ExportarPeriodoDto,
    @CurrentUser('id') usuarioId: string,
    @Res() res: Response,
  ): Promise<void> {
    const reporte = await this.recompensasPorMar.execute({ periodo: dto.periodo, usuarioId });
    enviar(res, await this.exportar.execute(tablaRecompensasPorMar(reporte), dto.formato));
  }

  @Get('recompensas-por-mar/historial')
  @ApiOperation({ summary: 'Instantaneas guardadas de reportes mensuales anteriores' })
  historialMensual(): Promise<InstantaneaReporte[]> {
    return this.historial.execute();
  }

  @Get('tendencias')
  @ApiOperation({ summary: 'Tendencias criminales por zona, afiliacion o nivel de amenaza' })
  reporteTendencias(@Query() dto: TendenciasDto): Promise<Tendencias> {
    return this.tendencias.execute(dto.agrupar);
  }

  @Get('tendencias/exportar')
  @ApiProduces('application/pdf', 'text/csv')
  @ApiOperation({ summary: 'Exporta las tendencias en PDF o CSV' })
  async exportarTendencias(
    @Query() dto: ExportarTendenciasDto,
    @Res() res: Response,
  ): Promise<void> {
    const tendencias = await this.tendencias.execute(dto.agrupar);
    enviar(res, await this.exportar.execute(tablaTendencias(tendencias), dto.formato));
  }

  @Get('estadisticas')
  @ApiOperation({ summary: 'Datos listos para graficos de distribucion ({ etiqueta, valor })' })
  datosEstadisticas(): Promise<Estadisticas> {
    return this.estadisticas.execute();
  }

  @Get('estadisticas/exportar')
  @ApiProduces('application/pdf', 'text/csv')
  @ApiOperation({ summary: 'Exporta las estadisticas en PDF o CSV' })
  async exportarEstadisticas(@Query() dto: FormatoDto, @Res() res: Response): Promise<void> {
    const datos = await this.estadisticas.execute();
    enviar(res, await this.exportar.execute(tablaEstadisticas(datos), dto.formato));
  }
}
