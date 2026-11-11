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
import { PageResult } from '../../../shared/application/pagination/page-result';
import type { AuthenticatedUser } from '../../../shared/domain/rbac/authenticated-user';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { BuscarCriminalesUseCase } from '../application/buscar-criminales.use-case';
import { CambiarEstadoCriminalUseCase } from '../application/cambiar-estado-criminal.use-case';
import { ObtenerCriminalUseCase } from '../application/obtener-criminal.use-case';
import { RegistrarCriminalUseCase } from '../application/registrar-criminal.use-case';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { CrearCriminalDto } from './dto/crear-criminal.dto';
import { FiltrarCriminalesDto } from './dto/filtrar-criminales.dto';
import { aCriminalResponse, type CriminalResponse } from './mappers/criminal.mapper';

/**
 * CONTROLLER DE REFERENCIA (RF-1).
 *
 * Reglas que siguen todos los controllers del proyecto:
 *  1. Delgado: valida con el DTO, invoca UN caso de uso, mapea la respuesta.
 *  2. Cero reglas de negocio y cero acceso a repositorios.
 *  3. Cada endpoint declara su permiso con @RequierePermisos.
 *  4. Las escrituras sensibles llevan @Audit.
 */
@ApiTags('criminales')
@ApiBearerAuth()
@Controller({ path: 'criminales', version: '1' })
export class CriminalesController {
  constructor(
    private readonly registrarCriminal: RegistrarCriminalUseCase,
    private readonly buscarCriminales: BuscarCriminalesUseCase,
    private readonly obtenerCriminal: ObtenerCriminalUseCase,
    private readonly cambiarEstado: CambiarEstadoCriminalUseCase,
  ) {}

  @Get()
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({ summary: 'Lista criminales con filtros y paginacion' })
  async listar(@Query() filtro: FiltrarCriminalesDto): Promise<PageResult<CriminalResponse>> {
    const pagina = await this.buscarCriminales.execute({
      q: filtro.q,
      estado: filtro.estado,
      nivelAmenaza: filtro.nivelAmenaza,
      zonaInfluenciaId: filtro.zonaInfluenciaId,
      organizacionId: filtro.organizacionId,
      page: filtro.page,
      limit: filtro.limit,
      order: filtro.order,
    });

    return pagina.map(aCriminalResponse);
  }

  @Get(':id')
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({ summary: 'Obtiene el detalle de un criminal' })
  async detalle(@Param('id', ParseIdPipe) id: string): Promise<CriminalResponse> {
    return aCriminalResponse(await this.obtenerCriminal.execute(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequierePermisos(Permiso.CRIMINALES_ESCRIBIR)
  @Audit('REGISTRAR_CRIMINAL')
  @ApiOperation({
    summary: 'Registra un criminal',
    description:
      'El nivel de amenaza queda PENDIENTE: lo calcula el modulo de amenaza (RF-5) al ' +
      'escuchar el evento. El cartel se genera de forma automatica (RF-2) por el mismo medio.',
  })
  async crear(
    @Body() dto: CrearCriminalDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<CriminalResponse> {
    const criminal = await this.registrarCriminal.execute({
      ...dto,
      usuarioId: usuario.id,
      baseNavalId: usuario.baseNavalId,
    });

    return aCriminalResponse(criminal);
  }

  @Patch(':id/estado')
  @RequierePermisos(Permiso.CRIMINALES_ESCRIBIR)
  @Audit('CAMBIAR_ESTADO_CRIMINAL')
  @ApiOperation({ summary: 'Cambia el estado de un criminal (captura, baja o reactivacion)' })
  async actualizarEstado(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: CambiarEstadoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<CriminalResponse> {
    const criminal = await this.cambiarEstado.execute({
      criminalId: id,
      nuevoEstado: dto.estado,
      version: dto.version,
      usuarioId: usuario.id,
    });

    return aCriminalResponse(criminal);
  }
}
