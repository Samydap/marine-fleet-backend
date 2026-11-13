import { DomainError } from '../../../shared/domain/errors/domain.error';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageResult } from '../../../shared/application/pagination/page-result';
import { Avistamiento } from '../domain/avistamiento.entity';
import { ReporteCiudadano } from '../domain/reporte-ciudadano.entity';
import type {
  FiltroReportes,
  ReporteCiudadanoRepositoryPort,
} from '../domain/reporte-ciudadano.repository.port';

@Injectable()
export class TypeOrmReporteCiudadanoRepository implements ReporteCiudadanoRepositoryPort {
  constructor(
    @InjectRepository(ReporteCiudadano) private readonly repo: Repository<ReporteCiudadano>,
  ) {}

  buscarPorId(id: string): Promise<ReporteCiudadano | null> {
    return this.repo.findOne({ where: { id } });
  }

  async listar(filtro: FiltroReportes): Promise<PageResult<ReporteCiudadano>> {
    const where = {
      ...(filtro.estado ? { estado: filtro.estado } : {}),
      ...(filtro.criminalId ? { criminalId: filtro.criminalId } : {}),
      ...(filtro.zonaInfluenciaId ? { zonaInfluenciaId: filtro.zonaInfluenciaId } : {}),
    };
    const [data, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: filtro.order },
      skip: (filtro.page - 1) * filtro.limit,
      take: filtro.limit,
    });
    return new PageResult(data, total, filtro.page, filtro.limit);
  }

  guardar(reporte: ReporteCiudadano): Promise<ReporteCiudadano> {
    return this.repo.save(reporte);
  }

  aprobarConAvistamiento(reporte: ReporteCiudadano, avistamiento: Avistamiento): Promise<void> {
    return this.repo.manager.transaction(async (manager) => {
      // Bloquea el reporte y confirma que SIGUE pendiente: si dos revisores
      // aprueban a la vez, el segundo espera, ve APROBADO y no crea un
      // avistamiento duplicado.
      const filas = (await manager.query(
        `SELECT estado FROM reportes_ciudadanos WHERE id = ? FOR UPDATE`,
        [reporte.id],
      )) as Array<{ estado: string }>;
      if (filas[0]?.estado !== 'PENDIENTE') {
        throw new DomainError(
          'El reporte ya fue revisado por otro usuario.',
          'REPORTE_YA_REVISADO',
        );
      }
      await manager.save(Avistamiento, avistamiento);
      await manager.save(ReporteCiudadano, reporte);
    });
  }
}
