import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalisisRiesgo } from '../domain/analisis-riesgo.entity';
import type { AnalisisRiesgoRepositoryPort } from '../domain/analisis-riesgo.repository.port';

@Injectable()
export class TypeOrmAnalisisRiesgoRepository implements AnalisisRiesgoRepositoryPort {
  constructor(
    @InjectRepository(AnalisisRiesgo) private readonly repo: Repository<AnalisisRiesgo>,
  ) {}

  guardar(analisis: AnalisisRiesgo): Promise<AnalisisRiesgo> {
    return this.repo.save(analisis);
  }

  listarPorCriminal(criminalId: string, limite: number): Promise<AnalisisRiesgo[]> {
    return this.repo.find({
      where: { criminalId },
      order: { fechaAnalisis: 'DESC' },
      take: limite,
    });
  }
}
