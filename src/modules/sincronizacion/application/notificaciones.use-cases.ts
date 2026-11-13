import { Inject, Injectable } from '@nestjs/common';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import type { AuthenticatedUser } from '../../../shared/domain/rbac/authenticated-user';
import { Permiso, tienePermiso } from '../../../shared/domain/rbac/permiso.enum';
import type { Notificacion } from '../domain/notificacion.entity';
import {
  NOTIFICACION_REPOSITORY,
  type NotificacionRepositoryPort,
} from '../domain/sincronizacion.ports';

type UsuarioNotificado = Pick<AuthenticatedUser, 'permisos' | 'baseNavalId'>;

function baseDe(usuario: UsuarioNotificado): string | null {
  return tienePermiso(usuario.permisos, Permiso.TODO) ? null : usuario.baseNavalId;
}

export interface ListarNotificacionesInput {
  readonly usuario: UsuarioNotificado;
  readonly soloNoLeidas: boolean;
  readonly page: number;
  readonly limit: number;
}

/**
 * Bandeja de notificaciones: las de la base del usuario mas las globales. Un
 * rol global (sin base) ve todas.
 */
@Injectable()
export class ListarNotificacionesUseCase implements UseCase<
  ListarNotificacionesInput,
  PageResult<Notificacion>
> {
  constructor(
    @Inject(NOTIFICACION_REPOSITORY) private readonly repositorio: NotificacionRepositoryPort,
  ) {}

  execute(input: ListarNotificacionesInput): Promise<PageResult<Notificacion>> {
    return this.repositorio.listar({
      baseNavalId: baseDe(input.usuario),
      soloNoLeidas: input.soloNoLeidas,
      page: input.page,
      limit: input.limit,
    });
  }
}

@Injectable()
export class MarcarNotificacionLeidaUseCase implements UseCase<
  { id: string; usuario: UsuarioNotificado },
  Notificacion
> {
  constructor(
    @Inject(NOTIFICACION_REPOSITORY) private readonly repositorio: NotificacionRepositoryPort,
  ) {}

  async execute(input: { id: string; usuario: UsuarioNotificado }): Promise<Notificacion> {
    const notificacion = await this.repositorio.buscarPorId(input.id);
    if (!notificacion) throw new NotFoundError('notificacion', input.id);

    const base = baseDe(input.usuario);
    if (base && notificacion.baseNavalId !== null && notificacion.baseNavalId !== base) {
      throw new ForbiddenError('marcar notificaciones de otra base naval');
    }

    notificacion.leida = true;
    return this.repositorio.guardar(notificacion);
  }
}
