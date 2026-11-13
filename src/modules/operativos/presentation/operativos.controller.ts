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
import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { AuthenticatedUser } from '../../../shared/domain/rbac/authenticated-user';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { AsignarBasesUseCase } from '../application/asignar-bases.use-case';
import { AsignarResponsablesUseCase } from '../application/asignar-responsables.use-case';
import { CambiarEstadoOperativoUseCase } from '../application/cambiar-estado-operativo.use-case';
import { CambiarPrioridadOperativoUseCase } from '../application/cambiar-prioridad-operativo.use-case';
import { CerrarOperativoUseCase } from '../application/cerrar-operativo.use-case';
import { CrearOperativoUseCase } from '../application/crear-operativo.use-case';
import { alcanceDe } from '../application/operativo-helpers';
import { ObtenerOperativoUseCase } from '../application/obtener-operativo.use-case';
import { TableroOperativosUseCase } from '../application/tablero-operativos.use-case';
import { AsignarBasesDto, AsignarResponsablesDto } from './dto/asignaciones.dto';
import {
  CambiarEstadoOperativoDto,
  CambiarPrioridadDto,
  CerrarOperativoDto,
} from './dto/cambios-operativo.dto';
import { CrearOperativoDto } from './dto/crear-operativo.dto';
import { FiltrarOperativosDto } from './dto/filtrar-operativos.dto';
import {
  aDetalleOperativoResponse,
  aOperativoResponse,
  type DetalleOperativoResponse,
  type OperativoResponse,
} from './mappers/operativo.mapper';

/** RF-4 Coordinacion de operativos entre bases navales. Controller delgado. */
@ApiTags('operativos')
@ApiBearerAuth()
@Controller({ path: 'operativos', version: '1' })
export class OperativosController {
  constructor(
    private readonly crear: CrearOperativoUseCase,
    private readonly asignarBases: AsignarBasesUseCase,
    private readonly asignarResponsables: AsignarResponsablesUseCase,
    private readonly cambiarEstado: CambiarEstadoOperativoUseCase,
    private readonly cambiarPrioridad: CambiarPrioridadOperativoUseCase,
    private readonly cerrar: CerrarOperativoUseCase,
    private readonly tablero: TableroOperativosUseCase,
    private readonly obtener: ObtenerOperativoUseCase,
  ) {}

  @Get()
  @RequierePermisos(Permiso.OPERATIVOS_LEER)
  @ApiOperation({ summary: 'Tablero de operativos (filtra por estado, prioridad, base, criminal)' })
  async listar(
    @Query() filtro: FiltrarOperativosDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<PageResult<OperativoResponse>> {
    const pagina = await this.tablero.execute({
      filtro: {
        q: filtro.q,
        estado: filtro.estado,
        prioridad: filtro.prioridad,
        baseNavalId: filtro.baseNavalId,
        criminalId: filtro.criminalId,
        page: filtro.page,
        limit: filtro.limit,
        order: filtro.order,
      },
      usuario,
    });
    return pagina.map(aOperativoResponse);
  }

  @Get(':id')
  @RequierePermisos(Permiso.OPERATIVOS_LEER)
  @ApiOperation({ summary: 'Detalle: bases, responsables, criminal objetivo e incidentes' })
  async detalle(
    @Param('id', ParseIdPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<DetalleOperativoResponse> {
    return aDetalleOperativoResponse(await this.obtener.execute({ id, usuario }));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequierePermisos(Permiso.OPERATIVOS_COORDINAR)
  @Audit('CREAR_OPERATIVO', { entidad: 'operativo', tipo: 'CREACION' })
  @ApiOperation({ summary: 'Crea un operativo de captura contra un criminal' })
  async crearOperativo(
    @Body() dto: CrearOperativoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<OperativoResponse> {
    const operativo = await this.crear.execute({
      ...dto,
      fechaInicioPlaneada: new Date(dto.fechaInicioPlaneada),
      usuarioId: usuario.id,
      alcanceBaseId: alcanceDe(usuario),
    });
    return aOperativoResponse(operativo);
  }

  @Post(':id/bases')
  @HttpCode(HttpStatus.OK)
  @RequierePermisos(Permiso.OPERATIVOS_COORDINAR)
  @Audit('ASIGNAR_BASES_OPERATIVO', { entidad: 'operativo', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Asigna una o varias bases navales con sus recursos' })
  async bases(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: AsignarBasesDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<OperativoResponse> {
    return aOperativoResponse(
      await this.asignarBases.execute({ operativoId: id, bases: dto.bases, usuario }),
    );
  }

  @Post(':id/responsables')
  @HttpCode(HttpStatus.OK)
  @RequierePermisos(Permiso.OPERATIVOS_COORDINAR)
  @Audit('ASIGNAR_RESPONSABLES_OPERATIVO', { entidad: 'operativo', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Asigna marines responsables del operativo' })
  async responsables(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: AsignarResponsablesDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<OperativoResponse> {
    return aOperativoResponse(
      await this.asignarResponsables.execute({
        operativoId: id,
        responsables: dto.responsables,
        usuario,
      }),
    );
  }

  @Patch(':id/estado')
  @RequierePermisos(Permiso.OPERATIVOS_COORDINAR)
  @Audit('CAMBIAR_ESTADO_OPERATIVO', { entidad: 'operativo', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Inicia (EN_CURSO) o aborta un operativo; notifica a las bases' })
  async estado(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: CambiarEstadoOperativoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<OperativoResponse> {
    return aOperativoResponse(
      await this.cambiarEstado.execute({
        operativoId: id,
        estado: dto.estado,
        version: dto.version,
        usuario,
      }),
    );
  }

  @Patch(':id/prioridad')
  @RequierePermisos(Permiso.OPERATIVOS_COORDINAR)
  @Audit('CAMBIAR_PRIORIDAD_OPERATIVO', { entidad: 'operativo', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Cambia la prioridad; notifica a las bases asignadas' })
  async prioridad(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: CambiarPrioridadDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<OperativoResponse> {
    return aOperativoResponse(
      await this.cambiarPrioridad.execute({
        operativoId: id,
        prioridad: dto.prioridad,
        version: dto.version,
        usuario,
      }),
    );
  }

  @Post(':id/cierre')
  @HttpCode(HttpStatus.OK)
  @RequierePermisos(Permiso.OPERATIVOS_COORDINAR)
  @Audit('CERRAR_OPERATIVO', { entidad: 'operativo', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Cierra (completa) el operativo con resultado final y observaciones' })
  async cierre(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: CerrarOperativoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<OperativoResponse> {
    return aOperativoResponse(
      await this.cerrar.execute({
        operativoId: id,
        resultado: dto.resultado,
        observaciones: dto.observaciones,
        version: dto.version,
        usuario,
      }),
    );
  }
}
