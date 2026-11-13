import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PageResult } from '../../../shared/application/pagination/page-result';
import { EstadoRecompensa } from '../domain/estado-recompensa.enum';
import { Recompensa } from '../domain/recompensa.entity';
import type {
  FiltroRecompensas,
  RecompensaRepositoryPort,
} from '../domain/recompensa.repository.port';

@Injectable()
export class TypeOrmRecompensaRepository implements RecompensaRepositoryPort {
  constructor(@InjectRepository(Recompensa) private readonly repo: Repository<Recompensa>) {}

  buscarPorId(id: string): Promise<Recompensa | null> {
    return this.repo.findOne({ where: { id } });
  }

  buscarVigente(criminalId: string): Promise<Recompensa | null> {
    return this.repo.findOne({ where: { criminalId, estado: EstadoRecompensa.VIGENTE } });
  }

  buscarPendiente(criminalId: string): Promise<Recompensa | null> {
    return this.repo.findOne({
      where: { criminalId, estado: EstadoRecompensa.PENDIENTE_VALIDACION },
    });
  }

  async listar(filtro: FiltroRecompensas): Promise<PageResult<Recompensa>> {
    const [data, total] = await this.repo.findAndCount({
      where: {
        ...(filtro.criminalId ? { criminalId: filtro.criminalId } : {}),
        ...(filtro.estado ? { estado: filtro.estado } : {}),
        ...(filtro.requiereValidacion !== undefined
          ? { requiereValidacion: filtro.requiereValidacion }
          : {}),
      },
      order: { fechaSolicitud: 'DESC' },
      skip: (filtro.page - 1) * filtro.limit,
      take: filtro.limit,
    });
    return new PageResult(data, total, filtro.page, filtro.limit);
  }

  historialPorCriminal(criminalId: string): Promise<Recompensa[]> {
    return this.repo.find({ where: { criminalId }, order: { fechaSolicitud: 'DESC' } });
  }

  guardar(recompensa: Recompensa): Promise<Recompensa> {
    return this.repo.save(recompensa);
  }

  activarReemplazandoVigente(nueva: Recompensa): Promise<Recompensa | null> {
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Recompensa);
      const anterior = await repo.findOne({
        where: {
          criminalId: nueva.criminalId,
          estado: EstadoRecompensa.VIGENTE,
          id: Not(nueva.id),
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (anterior) {
        anterior.pasarAHistorica(nueva.vigenteDesde ?? new Date());
        // update() solo de estado y fecha: el trigger de la base prohibe tocar el monto.
        await repo.update(
          { id: anterior.id },
          { estado: anterior.estado, vigenteHasta: anterior.vigenteHasta },
        );
      }
      await repo.save(nueva);
      return anterior;
    });
  }
}
