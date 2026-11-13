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
  Put,
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
import { ActualizarCriminalUseCase } from '../application/actualizar-criminal.use-case';
import { BuscarCriminalesUseCase } from '../application/buscar-criminales.use-case';
import { CambiarEstadoCriminalUseCase } from '../application/cambiar-estado-criminal.use-case';
import { CambiarFotoCriminalUseCase } from '../application/cambiar-foto-criminal.use-case';
import { ObtenerCriminalUseCase } from '../application/obtener-criminal.use-case';
import { RegistrarCriminalUseCase } from '../application/registrar-criminal.use-case';
import { ActualizarCriminalDto } from './dto/actualizar-criminal.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { CambiarFotoDto } from './dto/cambiar-foto.dto';
import { CrearCriminalDto } from './dto/crear-criminal.dto';
import { FiltrarCriminalesDto } from './dto/filtrar-criminales.dto';
import {
  aCriminalDetalleResponse,
  aCriminalResponse,
  type CriminalDetalleResponse,
  type CriminalResponse,
} from './mappers/criminal.mapper';

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
@ConNombres({ usuarios: ['creadoPor', 'actualizadoPor'], bases: ['origenBaseId'] })
@Controller({ path: 'criminales', version: '1' })
export class CriminalesController {
  constructor(
    private readonly registrarCriminal: RegistrarCriminalUseCase,
    private readonly buscarCriminales: BuscarCriminalesUseCase,
    private readonly obtenerCriminal: ObtenerCriminalUseCase,
    private readonly actualizarCriminal: ActualizarCriminalUseCase,
    private readonly cambiarFoto: CambiarFotoCriminalUseCase,
    private readonly cambiarEstado: CambiarEstadoCriminalUseCase,
  ) {}

  @Get()
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({
    summary: 'Busca criminales',
    description:
      'Filtros: q (nombre o alias), estado, nivelAmenaza, zonaInfluenciaId, organizacionId, ' +
      'categoria (PIRATA/REVOLUCIONARIO/CRIMINAL_INDEPENDIENTE), recompensaMin, recompensaMax.',
  })
  async listar(@Query() filtro: FiltrarCriminalesDto): Promise<PageResult<CriminalResponse>> {
    const pagina = await this.buscarCriminales.execute({
      q: filtro.q,
      estado: filtro.estado,
      nivelAmenaza: filtro.nivelAmenaza,
      zonaInfluenciaId: filtro.zonaInfluenciaId,
      organizacionId: filtro.organizacionId,
      categoria: filtro.categoria,
      recompensaMin: filtro.recompensaMin,
      recompensaMax: filtro.recompensaMax,
      page: filtro.page,
      limit: filtro.limit,
      order: filtro.order,
    });

    return pagina.map(aCriminalResponse);
  }

  @Get(':id')
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({ summary: 'Obtiene el detalle de un criminal con sus afiliaciones' })
  async detalle(@Param('id', ParseIdPipe) id: string): Promise<CriminalDetalleResponse> {
    return aCriminalDetalleResponse(await this.obtenerCriminal.execute(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequierePermisos(Permiso.CRIMINALES_ESCRIBIR)
  @Audit('REGISTRAR_CRIMINAL', { entidad: 'criminal', tipo: 'CREACION' })
  @ApiOperation({
    summary: 'Registra un criminal',
    description:
      'El nivel de amenaza lo calcula el modulo de amenaza (RF-5) al escuchar el evento; ' +
      'el cartel se genera de forma automatica (RF-2) por el mismo medio.',
  })
  async crear(
    @Body() dto: CrearCriminalDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<CriminalDetalleResponse> {
    const criminal = await this.registrarCriminal.execute({
      ...dto,
      usuarioId: usuario.id,
      baseNavalId: usuario.baseNavalId,
    });
    return aCriminalDetalleResponse(criminal);
  }

  @Patch(':id')
  @RequierePermisos(Permiso.CRIMINALES_ESCRIBIR)
  @Audit('ACTUALIZAR_CRIMINAL', { entidad: 'criminal', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Modifica los datos personales de un criminal (exige version)' })
  async actualizar(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: ActualizarCriminalDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<CriminalDetalleResponse> {
    const { version, ...cambios } = dto;
    const criminal = await this.actualizarCriminal.execute({
      criminalId: id,
      version,
      cambios,
      usuarioId: usuario.id,
    });
    return aCriminalDetalleResponse(criminal);
  }

  @Put(':id/foto')
  @RequierePermisos(Permiso.CRIMINALES_ESCRIBIR)
  @Audit('CAMBIAR_FOTO_CRIMINAL', { entidad: 'criminal', tipo: 'ACTUALIZACION' })
  @ApiOperation({
    summary: 'Sube o reemplaza la foto del criminal (JPG/PNG/WEBP, max 2 MB, en base64)',
    description: 'El cartel de busqueda se regenera automaticamente con la foto nueva.',
  })
  async foto(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: CambiarFotoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<CriminalDetalleResponse> {
    const base64 = dto.imagenBase64.replace(/^data:[^;]+;base64,/, '');
    const criminal = await this.cambiarFoto.execute({
      criminalId: id,
      contenido: Buffer.from(base64, 'base64'),
      mime: dto.mime,
      usuarioId: usuario.id,
    });
    return aCriminalDetalleResponse(criminal);
  }

  @Patch(':id/estado')
  @RequierePermisos(Permiso.CRIMINALES_ESCRIBIR)
  @Audit('CAMBIAR_ESTADO_CRIMINAL', { entidad: 'criminal', tipo: 'ELIMINACION_LOGICA' })
  @ApiOperation({
    summary: 'Da de baja (CAPTURADO / MUERTO) o reactiva a un criminal',
    description: 'Baja logica: el registro no se borra. Exige la version leida (409 si cambio).',
  })
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
