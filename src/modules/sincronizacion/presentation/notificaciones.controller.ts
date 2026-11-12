import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../../../common/pipes/parse-uuid.pipe';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { AuthenticatedUser } from '../../../shared/domain/rbac/authenticated-user';
import {
  ListarNotificacionesUseCase,
  MarcarNotificacionLeidaUseCase,
} from '../application/notificaciones.use-cases';
import type { Notificacion } from '../domain/notificacion.entity';
import { NotificacionesQueryDto } from './dto/sincronizacion.dto';

export interface NotificacionResponse {
  id: string;
  baseNavalId: string | null;
  tipo: string;
  titulo: string;
  mensaje: string;
  referenciaTipo: string | null;
  referenciaId: string | null;
  leida: boolean;
  createdAt: Date;
}

const aRespuesta = (n: Notificacion): NotificacionResponse => ({
  id: n.id,
  baseNavalId: n.baseNavalId,
  tipo: n.tipo,
  titulo: n.titulo,
  mensaje: n.mensaje,
  referenciaTipo: n.referenciaTipo,
  referenciaId: n.referenciaId,
  leida: Boolean(n.leida),
  createdAt: n.createdAt,
});

/** Bandeja de notificaciones de la base del usuario (mas las globales). */
@ApiTags('sincronizacion')
@ApiBearerAuth()
@Controller({ path: 'notificaciones', version: '1' })
export class NotificacionesController {
  constructor(
    private readonly listar: ListarNotificacionesUseCase,
    private readonly marcarLeida: MarcarNotificacionLeidaUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Notificaciones de mi base y globales' })
  async bandeja(
    @Query() query: NotificacionesQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<PageResult<NotificacionResponse>> {
    const pagina = await this.listar.execute({
      usuario,
      soloNoLeidas: query.soloNoLeidas ?? false,
      page: query.page,
      limit: query.limit,
    });
    return pagina.map(aRespuesta);
  }

  @Patch(':id/leida')
  @ApiOperation({ summary: 'Marca una notificacion como leida' })
  async leida(
    @Param('id', ParseIdPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<NotificacionResponse> {
    return aRespuesta(await this.marcarLeida.execute({ id, usuario }));
  }
}
