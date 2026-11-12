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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../../common/decorators/audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequierePermisos } from '../../../common/decorators/roles.decorator';
import { ParseIdPipe } from '../../../common/pipes/parse-uuid.pipe';
import { PageQueryDto } from '../../../shared/application/pagination/page-query.dto';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { AuthenticatedUser } from '../../../shared/domain/rbac/authenticated-user';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { CerrarIncidenteUseCase } from '../application/cerrar-incidente.use-case';
import { CorregirIncidenteUseCase } from '../application/corregir-incidente.use-case';
import {
  HistorialIncidentesUseCase,
  ObtenerIncidenteUseCase,
} from '../application/historial-incidentes.use-case';
import { RegistrarIncidenteUseCase } from '../application/registrar-incidente.use-case';
import { VincularOperativoUseCase } from '../application/vincular-operativo.use-case';
import type { FiltroIncidentes } from '../domain/incidente.repository.port';
import {
  CerrarIncidenteDto,
  CorregirIncidenteDto,
  VincularOperativoDto,
} from './dto/cambios-incidente.dto';
import { FiltrarIncidentesDto } from './dto/filtrar-incidentes.dto';
import { RegistrarIncidenteDto } from './dto/registrar-incidente.dto';
import { aIncidenteResponse, type IncidenteResponse } from './mappers/incidente.mapper';

const pagina = (q: PageQueryDto): Pick<FiltroIncidentes, 'page' | 'limit' | 'order'> => ({
  page: q.page,
  limit: q.limit,
  order: q.order,
});

/** RF-6 Historial de incidentes y enfrentamientos (clase Enfrentamiento). */
@ApiTags('incidentes')
@ApiBearerAuth()
@Controller({ path: 'incidentes', version: '1' })
export class IncidentesController {
  constructor(
    private readonly registrar: RegistrarIncidenteUseCase,
    private readonly corregir: CorregirIncidenteUseCase,
    private readonly vincular: VincularOperativoUseCase,
    private readonly cerrar: CerrarIncidenteUseCase,
    private readonly historial: HistorialIncidentesUseCase,
    private readonly obtener: ObtenerIncidenteUseCase,
  ) {}

  @Get()
  @RequierePermisos(Permiso.INCIDENTES_LEER)
  @ApiOperation({ summary: 'Historial de enfrentamientos con filtros combinables' })
  async listar(@Query() f: FiltrarIncidentesDto): Promise<PageResult<IncidenteResponse>> {
    return this.consultar({
      criminalId: f.criminalId,
      baseNavalId: f.baseNavalId,
      operativoId: f.operativoId,
      tipo: f.tipo,
      desde: f.desde ? new Date(f.desde) : undefined,
      hasta: f.hasta ? new Date(f.hasta) : undefined,
      ...pagina(f),
    });
  }

  @Get('por-criminal/:criminalId')
  @RequierePermisos(Permiso.INCIDENTES_LEER)
  @ApiOperation({ summary: 'Historial de enfrentamientos de un criminal' })
  porCriminal(
    @Param('criminalId', ParseIdPipe) criminalId: string,
    @Query() q: PageQueryDto,
  ): Promise<PageResult<IncidenteResponse>> {
    return this.consultar({ criminalId, ...pagina(q) });
  }

  @Get('por-base/:baseNavalId')
  @RequierePermisos(Permiso.INCIDENTES_LEER)
  @ApiOperation({ summary: 'Historial de enfrentamientos de una base naval' })
  porBase(
    @Param('baseNavalId', ParseIdPipe) baseNavalId: string,
    @Query() q: PageQueryDto,
  ): Promise<PageResult<IncidenteResponse>> {
    return this.consultar({ baseNavalId, ...pagina(q) });
  }

  @Get('por-operativo/:operativoId')
  @RequierePermisos(Permiso.INCIDENTES_LEER)
  @ApiOperation({ summary: 'Enfrentamientos originados en un operativo' })
  porOperativo(
    @Param('operativoId', ParseIdPipe) operativoId: string,
    @Query() q: PageQueryDto,
  ): Promise<PageResult<IncidenteResponse>> {
    return this.consultar({ operativoId, ...pagina(q) });
  }

  @Get(':id')
  @RequierePermisos(Permiso.INCIDENTES_LEER)
  @ApiOperation({ summary: 'Detalle de un enfrentamiento' })
  async detalle(@Param('id', ParseIdPipe) id: string): Promise<IncidenteResponse> {
    return aIncidenteResponse(await this.obtener.execute(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequierePermisos(Permiso.INCIDENTES_ESCRIBIR)
  @Audit('REGISTRAR_ENFRENTAMIENTO', { entidad: 'incidente', tipo: 'CREACION' })
  @ApiOperation({ summary: 'Registra un enfrentamiento (opcionalmente ligado a un operativo)' })
  async crear(
    @Body() dto: RegistrarIncidenteDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<IncidenteResponse> {
    const incidente = await this.registrar.execute({
      ...dto,
      fechaHora: new Date(dto.fechaHora),
      usuario,
    });
    return aIncidenteResponse(incidente);
  }

  @Patch(':id')
  @RequierePermisos(Permiso.INCIDENTES_ESCRIBIR)
  @Audit('CORREGIR_ENFRENTAMIENTO', { entidad: 'incidente', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Corrige los datos descriptivos de un enfrentamiento' })
  async corregirRegistro(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: CorregirIncidenteDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<IncidenteResponse> {
    const { version, fechaHora, ...resto } = dto;
    const incidente = await this.corregir.execute({
      incidenteId: id,
      version,
      cambios: { ...resto, fechaHora: fechaHora ? new Date(fechaHora) : undefined },
      usuario,
    });
    return aIncidenteResponse(incidente);
  }

  @Patch(':id/operativo')
  @RequierePermisos(Permiso.INCIDENTES_ESCRIBIR)
  @Audit('VINCULAR_ENFRENTAMIENTO_OPERATIVO', { entidad: 'incidente', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Vincula el enfrentamiento al operativo del que se origino' })
  async vincularOperativo(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: VincularOperativoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<IncidenteResponse> {
    return aIncidenteResponse(
      await this.vincular.execute({
        incidenteId: id,
        operativoId: dto.operativoId,
        version: dto.version,
        usuario,
      }),
    );
  }

  @Post(':id/cierre')
  @HttpCode(HttpStatus.OK)
  @RequierePermisos(Permiso.INCIDENTES_ESCRIBIR)
  @Audit('CERRAR_ENFRENTAMIENTO', { entidad: 'incidente', tipo: 'ACTUALIZACION' })
  @ApiOperation({
    summary: 'Cierra el enfrentamiento con resultado y desenlaces',
    description: 'Los criminales CAPTURADO o MUERTO cambian de estado (modulo Criminales).',
  })
  async cierre(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: CerrarIncidenteDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<IncidenteResponse> {
    return aIncidenteResponse(
      await this.cerrar.execute({
        incidenteId: id,
        resultado: dto.resultado,
        desenlaces: dto.desenlaces,
        observaciones: dto.observaciones,
        version: dto.version,
        usuario,
      }),
    );
  }

  private async consultar(filtro: FiltroIncidentes): Promise<PageResult<IncidenteResponse>> {
    return (await this.historial.execute(filtro)).map(aIncidenteResponse);
  }
}
