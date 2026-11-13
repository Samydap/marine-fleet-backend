import { ConNombres } from '../../../common/decorators/con-nombres.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequierePermisos } from '../../../common/decorators/roles.decorator';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { ConsultarAuditoriaUseCase } from '../application/consultar-auditoria.use-case';
import type { Auditoria } from '../domain/auditoria.entity';
import { FiltrarAuditoriaDto } from './dto/filtrar-auditoria.dto';

export interface AuditoriaResponse {
  id: string;
  fecha: Date;
  usuarioId: string | null;
  rol: string | null;
  accion: string;
  tipoAccion: string;
  entidad: string | null;
  entidadId: string | null;
  valorAnterior: unknown;
  valorNuevo: unknown;
  metodo: string | null;
  ruta: string | null;
  ip: string | null;
  exitoso: boolean;
}

const aRespuesta = (a: Auditoria): AuditoriaResponse => ({
  id: a.id,
  fecha: a.fecha,
  usuarioId: a.usuarioId,
  rol: a.rol,
  accion: a.accion,
  tipoAccion: a.tipoAccion,
  entidad: a.entidad,
  entidadId: a.entidadId,
  valorAnterior: a.valorAnterior,
  valorNuevo: a.valorNuevo,
  metodo: a.metodo,
  ruta: a.ruta,
  ip: a.ip,
  exitoso: Boolean(a.exitoso),
});

@ApiTags('auditoria')
@ApiBearerAuth()
@ConNombres({ usuarios: ['usuarioId'] })
@Controller({ path: 'auditoria', version: '1' })
export class AuditoriaController {
  constructor(private readonly consultar: ConsultarAuditoriaUseCase) {}

  @Get()
  @RequierePermisos(Permiso.AUDITORIA_LEER)
  @ApiOperation({
    summary: 'Consulta la bitacora de auditoria',
    description: 'Quien hizo que, cuando, sobre que registro y desde que IP. Solo lectura.',
  })
  async listar(@Query() filtro: FiltrarAuditoriaDto): Promise<PageResult<AuditoriaResponse>> {
    const pagina = await this.consultar.execute({
      usuarioId: filtro.usuarioId,
      accion: filtro.accion,
      entidad: filtro.entidad,
      entidadId: filtro.entidadId,
      exitoso: filtro.exitoso,
      desde: filtro.desde,
      hasta: filtro.hasta,
      page: filtro.page,
      limit: filtro.limit,
      order: filtro.order,
    });
    return pagina.map(aRespuesta);
  }
}
