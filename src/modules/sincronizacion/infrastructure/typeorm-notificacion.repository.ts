import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageResult } from '../../../shared/application/pagination/page-result';
import { Notificacion } from '../domain/notificacion.entity';
import type {
  FiltroNotificaciones,
  NotificacionRepositoryPort,
} from '../domain/sincronizacion.ports';

@Injectable()
export class TypeOrmNotificacionRepository implements NotificacionRepositoryPort {
  constructor(@InjectRepository(Notificacion) private readonly repo: Repository<Notificacion>) {}

  async guardarVarias(notificaciones: Notificacion[]): Promise<void> {
    await this.repo.save(notificaciones);
  }

  buscarPorId(id: string): Promise<Notificacion | null> {
    return this.repo.findOne({ where: { id } });
  }

  guardar(notificacion: Notificacion): Promise<Notificacion> {
    return this.repo.save(notificacion);
  }

  async listar(filtro: FiltroNotificaciones): Promise<PageResult<Notificacion>> {
    const query = this.repo.createQueryBuilder('n');
    if (filtro.baseNavalId) {
      query.andWhere('(n.base_naval_id = :base OR n.base_naval_id IS NULL)', {
        base: filtro.baseNavalId,
      });
    }
    if (filtro.soloNoLeidas) query.andWhere('n.leida = 0');

    const [data, total] = await query
      .orderBy('n.createdAt', 'DESC')
      .skip((filtro.page - 1) * filtro.limit)
      .take(filtro.limit)
      .getManyAndCount();
    return new PageResult(data, total, filtro.page, filtro.limit);
  }
}
