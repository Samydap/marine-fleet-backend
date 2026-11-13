import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../../common/decorators/audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequierePermisos } from '../../../common/decorators/roles.decorator';
import { ParseIdPipe } from '../../../common/pipes/parse-uuid.pipe';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { ActualizarAvistamientoUseCase } from '../application/actualizar-avistamiento.use-case';
import {
  ConsultarAvistamientosUseCase,
  ObtenerAvistamientoUseCase,
} from '../application/consultar-avistamientos.use-case';
import { EliminarAvistamientoUseCase } from '../application/eliminar-avistamiento.use-case';
import { RegistrarAvistamientoUseCase } from '../application/registrar-avistamiento.use-case';
import { VerificarAvistamientoUseCase } from '../application/verificar-avistamiento.use-case';
import { AvistamientoDto, VerificarAvistamientoDto } from './dto/avistamiento.dto';
import { aRangoDeFechas, FiltrarAvistamientosDto } from './dto/filtrar-avistamientos.dto';
import { aAvistamientoResponse, type AvistamientoResponse } from './mappers/inteligencia.mapper';

/** RF-3 Centro de Inteligencia: avistamientos. Contrato compatible con la v1 del frontend. */
@ApiTags('inteligencia')
@ApiBearerAuth()
@Controller({ path: 'avistamientos', version: '1' })
export class AvistamientosController {
  constructor(
    private readonly registrar: RegistrarAvistamientoUseCase,
    private readonly actualizar: ActualizarAvistamientoUseCase,
    private readonly eliminar: EliminarAvistamientoUseCase,
    private readonly verificar: VerificarAvistamientoUseCase,
    private readonly consultar: ConsultarAvistamientosUseCase,
    private readonly obtener: ObtenerAvistamientoUseCase,
  ) {}

  @Get()
  @RequierePermisos(Permiso.INTELIGENCIA_LEER)
  @ApiOperation({
    summary: 'Consulta avistamientos por criminal, zona, rango de fechas o verificacion',
  })
  async listar(@Query() dto: FiltrarAvistamientosDto): Promise<PageResult<AvistamientoResponse>> {
    const pagina = await this.consultar.execute({
      q: dto.q,
      criminalId: dto.criminalId,
      zonaInfluenciaId: dto.zonaInfluenciaId,
      estadoVerificacion: dto.estadoVerificacion,
      ...aRangoDeFechas(dto),
      page: dto.page,
      limit: dto.limit,
      order: dto.order,
    });
    return pagina.map((a) => aAvistamientoResponse(a));
  }

  @Get(':id')
  @RequierePermisos(Permiso.INTELIGENCIA_LEER)
  @ApiOperation({ summary: 'Detalle de un avistamiento' })
  async detalle(@Param('id', ParseIdPipe) id: string): Promise<AvistamientoResponse> {
    return aAvistamientoResponse(await this.obtener.execute(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequierePermisos(Permiso.INTELIGENCIA_ESCRIBIR)
  @Audit('REGISTRAR_AVISTAMIENTO', { entidad: 'avistamiento', tipo: 'CREACION' })
  @ApiOperation({ summary: 'Registra un avistamiento (queda PENDIENTE de verificacion)' })
  async crear(
    @Body() dto: AvistamientoDto,
    @CurrentUser('id') usuarioId: string,
  ): Promise<AvistamientoResponse> {
    const { avistamiento, criminalNombre } = await this.registrar.execute({ ...dto, usuarioId });
    return aAvistamientoResponse(avistamiento, criminalNombre);
  }

  @Put(':id')
  @RequierePermisos(Permiso.INTELIGENCIA_ESCRIBIR)
  @Audit('ACTUALIZAR_AVISTAMIENTO', { entidad: 'avistamiento', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Corrige un avistamiento no verificado' })
  async editar(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: AvistamientoDto,
  ): Promise<AvistamientoResponse> {
    const { avistamiento, criminalNombre } = await this.actualizar.execute({ ...dto, id });
    return aAvistamientoResponse(avistamiento, criminalNombre);
  }

  @Patch(':id/verificacion')
  @RequierePermisos(Permiso.INTELIGENCIA_REVISAR_REPORTES)
  @Audit('VERIFICAR_AVISTAMIENTO', { entidad: 'avistamiento', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Confirma (VERIFICADO) o descarta (DESCARTADO) un avistamiento' })
  async cambiarVerificacion(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: VerificarAvistamientoDto,
    @CurrentUser('id') usuarioId: string,
  ): Promise<AvistamientoResponse> {
    return aAvistamientoResponse(
      await this.verificar.execute({ id, estado: dto.estado, usuarioId }),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequierePermisos(Permiso.INTELIGENCIA_ESCRIBIR)
  @Audit('ELIMINAR_AVISTAMIENTO', { entidad: 'avistamiento', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Elimina un avistamiento cargado por error (no si esta verificado)' })
  async borrar(@Param('id', ParseIdPipe) id: string): Promise<void> {
    await this.eliminar.execute(id);
  }
}
