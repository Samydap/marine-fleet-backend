import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../../common/decorators/audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequierePermisos, Roles } from '../../../common/decorators/roles.decorator';
import { ParseIdPipe } from '../../../common/pipes/parse-uuid.pipe';
import type { AuthenticatedUser } from '../../../shared/domain/rbac/authenticated-user';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { RolCodigo } from '../../../shared/domain/rbac/rol.enum';
import { ActualizarCriteriosUseCase } from '../application/actualizar-criterios.use-case';
import {
  ClasificarCriminalUseCase,
  type ResultadoAnalisis,
} from '../application/clasificar-criminal.use-case';
import {
  ConsultarAmenazaUseCase,
  type DistribucionAmenaza,
} from '../application/consultar-amenaza.use-case';
import {
  ReclasificarMasivoUseCase,
  type ResumenReclasificacion,
} from '../application/reclasificar-masivo.use-case';
import {
  ActualizarCriteriosDto,
  DistribucionQueryDto,
  HistorialAnalisisQueryDto,
} from './dto/criterios.dto';
import {
  aAnalisisResponse,
  aCriterioResponse,
  type AnalisisResponse,
  type CriterioResponse,
} from './mappers/amenaza.mapper';

/** RF-5 Analisis y clasificacion de riesgo. */
@ApiTags('amenaza')
@ApiBearerAuth()
@Controller({ path: 'amenaza', version: '1' })
export class AmenazaController {
  constructor(
    private readonly consultar: ConsultarAmenazaUseCase,
    private readonly clasificar: ClasificarCriminalUseCase,
    private readonly reclasificar: ReclasificarMasivoUseCase,
    private readonly actualizarCriterios: ActualizarCriteriosUseCase,
  ) {}

  @Get('criterios')
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({ summary: 'Criterios vigentes (rango de recompensa por nivel)' })
  async criterios(): Promise<CriterioResponse[]> {
    return (await this.consultar.criteriosVigentes()).map(aCriterioResponse);
  }

  @Get('criterios/historial')
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({ summary: 'Todas las versiones de los criterios, con quien y por que' })
  async historialCriterios(): Promise<CriterioResponse[]> {
    return (await this.consultar.historialCriterios()).map(aCriterioResponse);
  }

  /**
   * RNF: UNICAMENTE el Analista de Datos. @Roles cierra la puerta incluso al
   * permiso ALL del Almirante; @RequierePermisos documenta la accion.
   */
  @Put('criterios')
  @Roles(RolCodigo.ANALISTA_DATOS_CRIMINALES)
  @RequierePermisos(Permiso.AMENAZA_CONFIGURAR_CRITERIOS)
  @Audit('ACTUALIZAR_CRITERIOS_AMENAZA', { entidad: 'criterio_amenaza', tipo: 'ACTUALIZACION' })
  @ApiOperation({
    summary: 'Reemplaza los criterios de clasificacion (solo Analista de Datos)',
    description: 'Versiona los anteriores y reclasifica a todos los criminales.',
  })
  async reemplazarCriterios(
    @Body() dto: ActualizarCriteriosDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<{ criterios: CriterioResponse[]; reclasificacion: ResumenReclasificacion }> {
    const resultado = await this.actualizarCriterios.execute({
      criterios: dto.criterios.map((c) => ({ ...c, montoMaximo: c.montoMaximo ?? null })),
      motivo: dto.motivo,
      usuarioId: usuario.id,
    });
    return {
      criterios: resultado.criterios.map(aCriterioResponse),
      reclasificacion: resultado.reclasificacion,
    };
  }

  @Post('clasificar/:criminalId')
  @HttpCode(HttpStatus.OK)
  @RequierePermisos(Permiso.CRIMINALES_ESCRIBIR)
  @Audit('CLASIFICAR_CRIMINAL', { entidad: 'criminal', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Fuerza la clasificacion de un criminal y explica el resultado' })
  clasificarCriminal(
    @Param('criminalId', ParseIdPipe) criminalId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<ResultadoAnalisis> {
    return this.clasificar.execute({ criminalId, usuarioId: usuario.id });
  }

  @Post('reclasificar')
  @HttpCode(HttpStatus.OK)
  @Roles(RolCodigo.ANALISTA_DATOS_CRIMINALES)
  @RequierePermisos(Permiso.AMENAZA_CONFIGURAR_CRITERIOS)
  @Audit('RECLASIFICAR_TODOS', { entidad: 'criminal', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Reclasifica a todos los criminales (solo Analista de Datos)' })
  reclasificarTodos(@CurrentUser() usuario: AuthenticatedUser): Promise<ResumenReclasificacion> {
    return this.reclasificar.execute(usuario.id);
  }

  @Get('distribucion')
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({ summary: 'Cantidad y porcentaje de criminales por nivel (grafico)' })
  distribucion(@Query() query: DistribucionQueryDto): Promise<DistribucionAmenaza> {
    return this.consultar.distribucion(query.soloActivos);
  }

  @Get('analisis/:criminalId')
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({ summary: 'Historial de analisis de riesgo de un criminal' })
  async historialAnalisis(
    @Param('criminalId', ParseIdPipe) criminalId: string,
    @Query() query: HistorialAnalisisQueryDto,
  ): Promise<AnalisisResponse[]> {
    return (await this.consultar.historialAnalisis(criminalId, query.limite)).map(
      aAnalisisResponse,
    );
  }
}
