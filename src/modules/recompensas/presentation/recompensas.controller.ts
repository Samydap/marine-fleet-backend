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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../../common/decorators/audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequierePermisos } from '../../../common/decorators/roles.decorator';
import { ParseIdPipe } from '../../../common/pipes/parse-uuid.pipe';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { AuthenticatedUser } from '../../../shared/domain/rbac/authenticated-user';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { ConsultarRecompensasUseCase } from '../application/consultar-recompensas.use-case';
import { SolicitarRecompensaUseCase } from '../application/solicitar-recompensa.use-case';
import { ValidarRecompensaUseCase } from '../application/validar-recompensa.use-case';
import {
  FiltrarRecompensasDto,
  SolicitarRecompensaDto,
  ValidarRecompensaDto,
} from './dto/recompensa.dto';
import { aRecompensaResponse, type RecompensaResponse } from './mappers/recompensa.mapper';

/** RF-1 / RF-5. Recompensas (bounties): solicitud, validacion e historial. */
@ApiTags('recompensas')
@ApiBearerAuth()
@ConNombres({ criminales: ['criminalId'], usuarios: ['solicitadaPor', 'validadaPor'] })
@Controller({ path: 'recompensas', version: '1' })
export class RecompensasController {
  constructor(
    private readonly solicitar: SolicitarRecompensaUseCase,
    private readonly validar: ValidarRecompensaUseCase,
    private readonly consultar: ConsultarRecompensasUseCase,
  ) {}

  @Get()
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({ summary: 'Lista recompensas (filtro por criminal, estado, alto rango)' })
  async listar(@Query() filtro: FiltrarRecompensasDto): Promise<PageResult<RecompensaResponse>> {
    return (await this.consultar.listar(filtro)).map(aRecompensaResponse);
  }

  @Get('pendientes')
  @RequierePermisos(Permiso.RECOMPENSAS_VALIDAR)
  @ApiOperation({ summary: 'Bandeja del Almirante: recompensas de alto rango por validar' })
  async pendientes(
    @Query() filtro: FiltrarRecompensasDto,
  ): Promise<PageResult<RecompensaResponse>> {
    return (await this.consultar.pendientes(filtro.page, filtro.limit)).map(aRecompensaResponse);
  }

  @Get('criminal/:criminalId')
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({ summary: 'Historial completo de recompensas de un criminal' })
  async historial(
    @Param('criminalId', ParseIdPipe) criminalId: string,
  ): Promise<RecompensaResponse[]> {
    return (await this.consultar.historial(criminalId)).map(aRecompensaResponse);
  }

  @Get(':id')
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({ summary: 'Detalle de una recompensa' })
  async detalle(@Param('id', ParseIdPipe) id: string): Promise<RecompensaResponse> {
    return aRecompensaResponse(await this.consultar.detalle(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequierePermisos(Permiso.RECOMPENSAS_SOLICITAR)
  @Audit('SOLICITAR_RECOMPENSA', { entidad: 'recompensa', tipo: 'CREACION' })
  @ApiOperation({
    summary: 'Solicita (o fija) la recompensa de un criminal',
    description:
      'Por debajo de 1.000.000.000 queda VIGENTE de inmediato. Desde ese monto queda ' +
      'PENDIENTE_VALIDACION hasta la firma del Almirante.',
  })
  async crear(
    @Body() dto: SolicitarRecompensaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<RecompensaResponse> {
    const recompensa = await this.solicitar.execute({
      ...dto,
      usuarioId: usuario.id,
      permisos: usuario.permisos,
    });
    return aRecompensaResponse(recompensa);
  }

  @Patch(':id/validacion')
  @RequierePermisos(Permiso.RECOMPENSAS_VALIDAR)
  @Audit('VALIDAR_RECOMPENSA', { entidad: 'recompensa', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Aprueba o rechaza una recompensa pendiente (Almirante)' })
  async validarRecompensa(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: ValidarRecompensaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<RecompensaResponse> {
    const recompensa = await this.validar.execute({
      recompensaId: id,
      aprobar: dto.aprobar,
      motivo: dto.motivo,
      usuarioId: usuario.id,
      permisos: usuario.permisos,
    });
    return aRecompensaResponse(recompensa);
  }
}
