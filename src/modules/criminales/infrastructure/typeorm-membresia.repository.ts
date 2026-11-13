import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membresia } from '../domain/membresia.entity';
import type { MembresiaRepositoryPort } from '../domain/membresia.repository.port';

@Injectable()
export class TypeOrmMembresiaRepository implements MembresiaRepositoryPort {
  constructor(@InjectRepository(Membresia) private readonly repo: Repository<Membresia>) {}

  buscarVigente(criminalId: string, organizacionId: string): Promise<Membresia | null> {
    return this.repo.findOne({
      where: { criminalId, organizacionId, vigente: true },
      relations: { organizacion: true },
    });
  }

  listarPorCriminal(criminalId: string, soloVigentes: boolean): Promise<Membresia[]> {
    return this.repo.find({
      where: soloVigentes ? { criminalId, vigente: true } : { criminalId },
      relations: { organizacion: true },
      order: { createdAt: 'DESC' },
    });
  }

  listarPorOrganizacion(organizacionId: string, soloVigentes: boolean): Promise<Membresia[]> {
    return this.repo.find({
      where: soloVigentes ? { organizacionId, vigente: true } : { organizacionId },
      relations: { criminal: true },
      order: { rol: 'ASC', createdAt: 'ASC' },
    });
  }

  guardar(membresia: Membresia): Promise<Membresia> {
    return this.repo.save(membresia);
  }
}
