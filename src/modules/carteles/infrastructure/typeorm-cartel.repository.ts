import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cartel } from '../domain/cartel.entity';
import type { CartelRepositoryPort } from '../domain/cartel.repository.port';

@Injectable()
export class TypeOrmCartelRepository implements CartelRepositoryPort {
  constructor(@InjectRepository(Cartel) private readonly repo: Repository<Cartel>) {}

  buscarPorId(id: string): Promise<Cartel | null> {
    return this.repo.findOne({ where: { id } });
  }

  buscarVigente(criminalId: string): Promise<Cartel | null> {
    return this.repo.findOne({
      where: { criminalId, vigente: true },
      order: { numeroVersion: 'DESC' },
    });
  }

  listarVersiones(criminalId: string): Promise<Cartel[]> {
    return this.repo.find({ where: { criminalId }, order: { numeroVersion: 'DESC' } });
  }

  guardarNuevaVersion(cartel: Cartel): Promise<Cartel> {
    return this.repo.manager.transaction(async (manager) => {
      await manager.update(
        Cartel,
        { criminalId: cartel.criminalId, vigente: true },
        { vigente: false },
      );
      return manager.save(Cartel, cartel);
    });
  }

  async listarCriminalesConCartel(): Promise<string[]> {
    const filas = await this.repo
      .createQueryBuilder('cartel')
      .select('DISTINCT cartel.criminal_id', 'criminalId')
      .getRawMany<{ criminalId: string }>();
    return filas.map((fila) => fila.criminalId);
  }
}
