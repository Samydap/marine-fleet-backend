import { ConNombres } from '../../../common/decorators/con-nombres.decorator';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { Audit } from '../../../common/decorators/audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { RequierePermisos } from '../../../common/decorators/roles.decorator';
import { ParseIdPipe } from '../../../common/pipes/parse-uuid.pipe';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { ListarReportesUseCase } from '../application/listar-reportes.use-case';
import {
  RegistrarReporteCiudadanoUseCase,
  type ReporteRecibido,
} from '../application/registrar-reporte-ciudadano.use-case';
import { RevisarReporteUseCase } from '../application/revisar-reporte.use-case';
import {
  CrearReporteCiudadanoDto,
  FiltrarReportesDto,
  RevisarReporteDto,
} from './dto/reporte-ciudadano.dto';
import { LimiteReportesGuard } from './guards/limite-reportes.guard';
import { aReporteResponse, type ReporteCiudadanoResponse } from './mappers/inteligencia.mapper';

/** RF-3 Centro de Inteligencia: reportes de la ciudadania y su revision. */
@ApiTags('inteligencia')
@ConNombres({ criminales: ['criminalId'], usuarios: ['revisadoPor'] })
@Controller({ path: 'reportes-ciudadanos', version: '1' })
export class ReportesCiudadanosController {
  constructor(
    private readonly registrar: RegistrarReporteCiudadanoUseCase,
    private readonly listarReportes: ListarReportesUseCase,
    private readonly revisar: RevisarReporteUseCase,
  ) {}

  /** @Public() justificado: lo usa la ciudadania. Protegido con limite por IP. */
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(LimiteReportesGuard)
  @Audit('RECIBIR_REPORTE_CIUDADANO', { entidad: 'reporte_ciudadano', tipo: 'CREACION' })
  @ApiOperation({ summary: 'Envia un reporte ciudadano (publico, maximo 5 por minuto por IP)' })
  @ApiTooManyRequestsResponse({ description: 'Se supero el limite de reportes por minuto' })
  crear(@Body() dto: CrearReporteCiudadanoDto): Promise<ReporteRecibido> {
    return this.registrar.execute(dto);
  }

  @Get()
  @ApiBearerAuth()
  @RequierePermisos(Permiso.INTELIGENCIA_LEER)
  @ApiOperation({
    summary: 'Bandeja de reportes ciudadanos (filtrable por estado, criminal o zona)',
  })
  async listar(@Query() dto: FiltrarReportesDto): Promise<PageResult<ReporteCiudadanoResponse>> {
    const pagina = await this.listarReportes.execute({
      estado: dto.estado,
      criminalId: dto.criminalId,
      zonaInfluenciaId: dto.zonaInfluenciaId,
      page: dto.page,
      limit: dto.limit,
      order: dto.order,
    });
    return pagina.map(aReporteResponse);
  }

  @Patch(':id/revision')
  @ApiBearerAuth()
  @RequierePermisos(Permiso.INTELIGENCIA_REVISAR_REPORTES)
  @Audit('REVISAR_REPORTE_CIUDADANO', { entidad: 'reporte_ciudadano', tipo: 'ACTUALIZACION' })
  @ApiOperation({
    summary: 'Aprueba (crea avistamiento oficial) o rechaza (con motivo) un reporte',
  })
  async revisarReporte(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: RevisarReporteDto,
    @CurrentUser('id') usuarioId: string,
  ): Promise<ReporteCiudadanoResponse & { avistamientoCreadoId: string | null }> {
    const { reporte, avistamientoId } = await this.revisar.execute({
      reporteId: id,
      decision: dto.decision,
      motivoRechazo: dto.motivoRechazo,
      usuarioId,
    });
    return { ...aReporteResponse(reporte), avistamientoCreadoId: avistamientoId };
  }
}
