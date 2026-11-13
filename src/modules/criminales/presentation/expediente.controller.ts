import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { AfiliarAOrganizacionUseCase } from '../application/afiliar-a-organizacion.use-case';
import { ConsultarHistorialCriminalUseCase } from '../application/consultar-historial-criminal.use-case';
import { DesafiliarDeOrganizacionUseCase } from '../application/desafiliar-de-organizacion.use-case';
import { GestionarAntecedentesUseCase } from '../application/gestionar-antecedentes.use-case';
import type { EntradaHistorial } from '../domain/historial.repository.port';
import { AfiliarDto } from './dto/afiliar.dto';
import { RegistrarAntecedenteDto } from './dto/antecedente.dto';
import { FiltrarHistorialDto } from './dto/historial.dto';
import { aAfiliacionResponse, type AfiliacionResponse } from './mappers/criminal.mapper';
import { aAntecedenteResponse, type AntecedenteResponse } from './mappers/organizacion.mapper';

/**
 * RF-1. El "expediente" de un criminal: afiliaciones, antecedentes e historial
 * de modificaciones. Separado de CriminalesController para que ninguno de los
 * dos pase de 300 lineas; comparten el prefijo /criminales/:id.
 */
@ApiTags('criminales')
@ApiBearerAuth()
@Controller({ path: 'criminales/:id', version: '1' })
export class ExpedienteController {
  constructor(
    private readonly afiliar: AfiliarAOrganizacionUseCase,
    private readonly desafiliar: DesafiliarDeOrganizacionUseCase,
    private readonly antecedentes: GestionarAntecedentesUseCase,
    private readonly historial: ConsultarHistorialCriminalUseCase,
  ) {}

  @Post('afiliaciones')
  @HttpCode(HttpStatus.CREATED)
  @RequierePermisos(Permiso.CRIMINALES_ESCRIBIR)
  @Audit('AFILIAR_CRIMINAL', { entidad: 'criminal', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Afilia el criminal a una tripulacion, organizacion o banda' })
  async afiliarCriminal(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: AfiliarDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<AfiliacionResponse> {
    const membresia = await this.afiliar.execute({
      criminalId: id,
      organizacionId: dto.organizacionId,
      rol: dto.rol,
      fechaIngreso: dto.fechaIngreso,
      usuarioId: usuario.id,
    });
    return aAfiliacionResponse(membresia);
  }

  @Delete('afiliaciones/:organizacionId')
  @RequierePermisos(Permiso.CRIMINALES_ESCRIBIR)
  @Audit('DESAFILIAR_CRIMINAL', { entidad: 'criminal', tipo: 'ELIMINACION_LOGICA' })
  @ApiOperation({ summary: 'Cierra la afiliacion vigente (queda en el historial)' })
  async desafiliarCriminal(
    @Param('id', ParseIdPipe) id: string,
    @Param('organizacionId', ParseIdPipe) organizacionId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<AfiliacionResponse> {
    const membresia = await this.desafiliar.execute({
      criminalId: id,
      organizacionId,
      usuarioId: usuario.id,
    });
    return aAfiliacionResponse(membresia);
  }

  @Get('antecedentes')
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({ summary: 'Lista los antecedentes y delitos del criminal' })
  async listarAntecedentes(@Param('id', ParseIdPipe) id: string): Promise<AntecedenteResponse[]> {
    return (await this.antecedentes.listar(id)).map(aAntecedenteResponse);
  }

  @Post('antecedentes')
  @HttpCode(HttpStatus.CREATED)
  @RequierePermisos(Permiso.CRIMINALES_ESCRIBIR)
  @Audit('REGISTRAR_ANTECEDENTE', { entidad: 'antecedente', tipo: 'CREACION' })
  @ApiOperation({ summary: 'Registra un antecedente o delito del criminal' })
  async registrarAntecedente(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: RegistrarAntecedenteDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<AntecedenteResponse> {
    const antecedente = await this.antecedentes.registrar({
      criminalId: id,
      ...dto,
      usuarioId: usuario.id,
    });
    return aAntecedenteResponse(antecedente);
  }

  @Get('historial')
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({
    summary: 'Historial de modificaciones (trazabilidad)',
    description:
      'Cada cambio de recompensa, estado, afiliacion o datos personales con quien y cuando. ' +
      'Lo escriben triggers de la base de datos.',
  })
  consultarHistorial(
    @Param('id', ParseIdPipe) id: string,
    @Query() filtro: FiltrarHistorialDto,
  ): Promise<PageResult<EntradaHistorial>> {
    return this.historial.execute({
      criminalId: id,
      campo: filtro.campo,
      page: filtro.page,
      limit: filtro.limit,
    });
  }
}
