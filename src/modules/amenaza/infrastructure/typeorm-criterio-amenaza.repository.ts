import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { CriterioAmenaza } from '../domain/criterio-amenaza.entity';
import type { CriterioAmenazaRepositoryPort } from '../domain/criterio-amenaza.repository.port';
import type { CriterioVigente } from '../domain/motor-clasificacion';

@Injectable()
export class TypeOrmCriterioAmenazaRepository implements CriterioAmenazaRepositoryPort {
  constructor(
    @InjectRepository(CriterioAmenaza) private readonly repo: Repository<CriterioAmenaza>,
  ) {}

  listarVigentes(): Promise<CriterioAmenaza[]> {
    return this.repo.find({ where: { vigente: true }, order: { montoMinimo: 'ASC' } });
  }

  listarHistorial(): Promise<CriterioAmenaza[]> {
    return this.repo.find({ order: { vigenteDesde: 'DESC', montoMinimo: 'ASC' } });
  }

  reemplazarVigentes(
    nuevos: readonly CriterioVigente[],
    usuarioId: string,
    motivo: string,
  ): Promise<CriterioAmenaza[]> {
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(CriterioAmenaza);
      const ahora = new Date();

      await repo.update({ vigente: true }, { vigente: false, vigenteHasta: ahora });

      const filas = nuevos.map((c) =>
        repo.create({
          id: randomUUID(),
          nivel: c.nivel,
          montoMinimo: c.montoMinimo,
          montoMaximo: c.montoMaximo,
          vigente: true,
          vigenteDesde: ahora,
          vigenteHasta: null,
          modificadoPor: usuarioId,
          motivo,
        }),
      );
      return repo.save(filas);
    });
  }
}
