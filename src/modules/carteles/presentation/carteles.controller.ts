import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Audit } from '../../../common/decorators/audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequierePermisos } from '../../../common/decorators/roles.decorator';
import { ParseIdPipe } from '../../../common/pipes/parse-uuid.pipe';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { DescargarCartelUseCase } from '../application/descargar-cartel.use-case';
import { GenerarCartelUseCase } from '../application/generar-cartel.use-case';
import { ListarVersionesCartelUseCase } from '../application/listar-versiones-cartel.use-case';
import { ObtenerCartelVigenteUseCase } from '../application/obtener-cartel-vigente.use-case';
import {
  RegenerarTodosUseCase,
  type ResultadoRegeneracion,
} from '../application/regenerar-todos.use-case';
import { MotivoGeneracion } from '../domain/cartel.entity';
import { DescargarCartelDto } from './dto/descargar-cartel.dto';
import { enviarArchivo } from './enviar-archivo';
import { aCartelResponse, type CartelResponse } from './mappers/cartel.mapper';

/**
 * RF-2 Carteles de busqueda. La generacion normal es AUTOMATICA (por eventos);
 * los POST de este controller son para generar a mano o completar los que
 * faltan. Leer carteles exige CRIMINALES_LEER: quien ve criminales ve carteles.
 */
@ApiTags('carteles')
@ApiBearerAuth()
@Controller({ path: 'carteles', version: '1' })
export class CartelesController {
  constructor(
    private readonly obtenerVigente: ObtenerCartelVigenteUseCase,
    private readonly listarVersiones: ListarVersionesCartelUseCase,
    private readonly descargar: DescargarCartelUseCase,
    private readonly generar: GenerarCartelUseCase,
    private readonly regenerarTodos: RegenerarTodosUseCase,
  ) {}

  @Get('criminal/:criminalId')
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({ summary: 'Cartel vigente de un criminal' })
  async vigente(@Param('criminalId', ParseIdPipe) criminalId: string): Promise<CartelResponse> {
    return aCartelResponse(await this.obtenerVigente.execute(criminalId));
  }

  @Get('criminal/:criminalId/versiones')
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiOperation({ summary: 'Historial de versiones del cartel de un criminal' })
  async versiones(@Param('criminalId', ParseIdPipe) criminalId: string): Promise<CartelResponse[]> {
    return (await this.listarVersiones.execute(criminalId)).map(aCartelResponse);
  }

  @Get(':id/descargar')
  @RequierePermisos(Permiso.CRIMINALES_LEER)
  @ApiProduces('application/pdf', 'image/svg+xml')
  @ApiOperation({ summary: 'Descarga una version del cartel en PDF o como imagen (SVG)' })
  async descargarCartel(
    @Param('id', ParseIdPipe) id: string,
    @Query() dto: DescargarCartelDto,
    @Res() res: Response,
  ): Promise<void> {
    enviarArchivo(res, await this.descargar.execute({ cartelId: id, formato: dto.formato }));
  }

  @Post('criminal/:criminalId/generar')
  @HttpCode(HttpStatus.CREATED)
  @RequierePermisos(Permiso.CARTELES_GENERAR)
  @Audit('GENERAR_CARTEL_MANUAL', { entidad: 'cartel', tipo: 'CREACION' })
  @ApiOperation({ summary: 'Genera a mano una version nueva del cartel (motivo MANUAL)' })
  async generarManual(
    @Param('criminalId', ParseIdPipe) criminalId: string,
    @CurrentUser('id') usuarioId: string,
  ): Promise<CartelResponse> {
    const { cartel } = await this.generar.execute({
      criminalId,
      motivo: MotivoGeneracion.MANUAL,
      usuarioId,
      forzar: true,
    });
    return aCartelResponse(cartel);
  }

  @Post('regenerar-todos')
  @HttpCode(HttpStatus.OK)
  @RequierePermisos(Permiso.CARTELES_GENERAR)
  @Audit('GENERAR_CARTELES_FALTANTES', { entidad: 'cartel', tipo: 'CREACION' })
  @ApiOperation({ summary: 'Genera el cartel inicial de los criminales que aun no tienen uno' })
  regenerar(@CurrentUser('id') usuarioId: string): Promise<ResultadoRegeneracion> {
    return this.regenerarTodos.execute(usuarioId);
  }
}
