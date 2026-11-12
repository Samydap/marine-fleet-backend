import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Antecedente } from '../domain/antecedente.entity';
import type { AntecedenteRepositoryPort } from '../domain/antecedente.repository.port';

@Injectable()
export class TypeOrmAntecedenteRepository implements AntecedenteRepositoryPort {
  constructor(@InjectRepository(Antecedente) private readonly repo: Repository<Antecedente>) {}

  listarPorCriminal(criminalId: string): Promise<Antecedente[]> {
    return this.repo.find({
      where: { criminalId },
      order: { fechaHecho: 'DESC', createdAt: 'DESC' },
    });
  }

  guardar(antecedente: Antecedente): Promise<Antecedente> {
    return this.repo.save(antecedente);
  }
}
