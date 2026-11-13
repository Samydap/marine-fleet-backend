import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../../common/decorators/audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequierePermisos } from '../../../common/decorators/roles.decorator';
import { ParseIdPipe } from '../../../common/pipes/parse-uuid.pipe';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { ActualizarOrganizacionUseCase } from '../application/actualizar-organizacion.use-case';
import { ConsultarOrganizacionesUseCase } from '../application/consultar-organizaciones.use-case';
import { CrearOrganizacionUseCase } from '../application/crear-organizacion.use-case';
import {
  ActualizarOrganizacionDto,
  CrearOrganizacionDto,
  FiltrarOrganizacionesDto,
} from './dto/organizacion.dto';
import {
  aOrganizacionDetalleResponse,
  aOrganizacionResponse,
  type OrganizacionDetalleResponse,
  type OrganizacionResponse,
} from './mappers/organizacion.mapper';

/** RF-1. Tripulaciones, organizaciones y bandas: tipo, lider y miembros conocidos. */
@ApiTags('criminales')
@ApiBearerAuth()
@Controller({ path: 'organizaciones', version: '1' })
export class OrganizacionesController {
  constructor(
    private readonly crearOrganizacion: CrearOrganizacionUseCase,
    private readonly actualizarOrganizacion: ActualizarOrganizacionUseCase,
    private readonly consultar: ConsultarOrganizacionesUseCase,
  ) {}

  @Get()
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({ summary: 'Lista organizaciones (filtro por categoria, tipo, zona, activa)' })
  async listar(
    @Query() filtro: FiltrarOrganizacionesDto,
  ): Promise<PageResult<OrganizacionResponse>> {
    const pagina = await this.consultar.listar({
      q: filtro.q,
      categoria: filtro.categoria,
      tipoAgrupacion: filtro.tipoAgrupacion,
      zonaInfluenciaId: filtro.zonaInfluenciaId,
      activa: filtro.activa,
      page: filtro.page,
      limit: filtro.limit,
    });
    return pagina.map(aOrganizacionResponse);
  }

  @Get(':id')
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiQuery({ name: 'historicos', required: false, type: Boolean })
  @ApiOperation({ summary: 'Detalle con lider y miembros conocidos' })
  async detalle(
    @Param('id', ParseIdPipe) id: string,
    @Query('historicos', new ParseBoolPipe({ optional: true })) historicos?: boolean,
  ): Promise<OrganizacionDetalleResponse> {
    return aOrganizacionDetalleResponse(await this.consultar.detalle(id, historicos ?? false));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequierePermisos(Permiso.CRIMINALES_ESCRIBIR)
  @Audit('REGISTRAR_ORGANIZACION', { entidad: 'organizacion', tipo: 'CREACION' })
  @ApiOperation({ summary: 'Registra una tripulacion, organizacion o banda' })
  async crear(@Body() dto: CrearOrganizacionDto): Promise<OrganizacionResponse> {
    return aOrganizacionResponse(await this.crearOrganizacion.execute(dto));
  }

  @Patch(':id')
  @RequierePermisos(Permiso.CRIMINALES_ESCRIBIR)
  @Audit('ACTUALIZAR_ORGANIZACION', { entidad: 'organizacion', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Edita una organizacion o la disuelve (activa=false)' })
  async actualizar(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: ActualizarOrganizacionDto,
    @CurrentUser('id') usuarioId: string,
  ): Promise<OrganizacionResponse> {
    return aOrganizacionResponse(
      await this.actualizarOrganizacion.execute({ organizacionId: id, ...dto, usuarioId }),
    );
  }
}
