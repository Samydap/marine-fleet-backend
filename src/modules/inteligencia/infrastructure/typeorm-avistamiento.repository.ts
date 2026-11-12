import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageResult } from '../../../shared/application/pagination/page-result';
import { Avistamiento } from '../domain/avistamiento.entity';
import type {
  AvistamientoRepositoryPort,
  FiltroAvistamientos,
} from '../domain/avistamiento.repository.port';

/**
 * Las consultas parametrizadas de la v1 se conservan: nunca se interpola texto
 * del usuario en el SQL. El join con criminales trae el nombre para la tabla del
 * frontend en la MISMA consulta (sin N+1).
 */
@Injectable()
export class TypeOrmAvistamientoRepository implements AvistamientoRepositoryPort {
  constructor(@InjectRepository(Avistamiento) private readonly repo: Repository<Avistamiento>) {}

  buscarPorId(id: string): Promise<Avistamiento | null> {
    return this.repo.findOne({ where: { id }, relations: { criminal: true } });
  }

  async listar(filtro: FiltroAvistamientos): Promise<PageResult<Avistamiento>> {
    const query = this.repo
      .createQueryBuilder('avistamiento')
      .leftJoinAndSelect('avistamiento.criminal', 'criminal');

    if (filtro.q) {
      query.andWhere(
        '(avistamiento.ubicacion LIKE :q OR avistamiento.testigo LIKE :q OR criminal.nombre LIKE :q)',
        { q: `%${filtro.q}%` },
      );
    }
    if (filtro.criminalId) {
      query.andWhere('avistamiento.criminal_id = :criminalId', { criminalId: filtro.criminalId });
    }
    if (filtro.zonaInfluenciaId) {
      query.andWhere('avistamiento.zona_influencia_id = :zona', { zona: filtro.zonaInfluenciaId });
    }
    if (filtro.estadoVerificacion) {
      query.andWhere('avistamiento.estado_verificacion = :estado', {
        estado: filtro.estadoVerificacion,
      });
    }
    if (filtro.desde) {
      query.andWhere('avistamiento.fecha_hora >= :desde', { desde: filtro.desde });
    }
    if (filtro.hasta) {
      query.andWhere('avistamiento.fecha_hora <= :hasta', { hasta: filtro.hasta });
    }

    const [data, total] = await query
      .orderBy('avistamiento.fechaHora', filtro.order)
      .skip((filtro.page - 1) * filtro.limit)
      .take(filtro.limit)
      .getManyAndCount();

    return new PageResult(data, total, filtro.page, filtro.limit);
  }

  async guardar(avistamiento: Avistamiento): Promise<Avistamiento> {
    await this.repo.save(avistamiento);
    return (await this.buscarPorId(avistamiento.id)) ?? avistamiento;
  }

  async eliminar(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
