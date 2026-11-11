import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageResult } from '../../../shared/application/pagination/page-result';
import { Criminal } from '../domain/criminal.entity';
import type {
  CriminalReaderPort,
  CriminalRepositoryPort,
  CriminalResumen,
  FiltroCriminales,
} from '../domain/criminal.repository.port';

/**
 * ADAPTADOR DE REFERENCIA. Implementa los dos puertos del modulo y es el unico
 * archivo del slice que conoce TypeORM. Si manana se cambia de ORM, cambia este
 * archivo y nada mas.
 */
@Injectable()
export class TypeOrmCriminalRepository implements CriminalRepositoryPort, CriminalReaderPort {
  constructor(
    @InjectRepository(Criminal)
    private readonly repo: Repository<Criminal>,
  ) {}

  buscarPorId(id: string): Promise<Criminal | null> {
    return this.repo.findOne({ where: { id }, relations: { membresias: true } });
  }

  buscarPorNombreNormalizado(nombreNormalizado: string): Promise<Criminal | null> {
    return this.repo.findOne({ where: { nombreNormalizado } });
  }

  async listar(filtro: FiltroCriminales): Promise<PageResult<Criminal>> {
    const query = this.repo.createQueryBuilder('criminal');

    if (filtro.q) {
      // Parametrizado siempre: nunca interpolar texto del usuario en el SQL.
      query.andWhere('(criminal.nombre LIKE :q OR criminal.nombre_normalizado LIKE :q)', {
        q: `%${filtro.q}%`,
      });
    }
    if (filtro.estado) {
      query.andWhere('criminal.estado = :estado', { estado: filtro.estado });
    }
    if (filtro.nivelAmenaza) {
      query.andWhere('criminal.nivel_amenaza = :nivel', { nivel: filtro.nivelAmenaza });
    }
    if (filtro.zonaInfluenciaId) {
      query.andWhere('criminal.zona_influencia_id = :zona', { zona: filtro.zonaInfluenciaId });
    }
    if (filtro.organizacionId) {
      query
        .innerJoin('criminal.membresias', 'membresia')
        .andWhere('membresia.organizacion_id = :org AND membresia.vigente = 1', {
          org: filtro.organizacionId,
        });
    }

    const [data, total] = await query
      .orderBy('criminal.recompensa_vigente_monto', filtro.order)
      .skip((filtro.page - 1) * filtro.limit)
      .take(filtro.limit)
      .getManyAndCount();

    return new PageResult(data, total, filtro.page, filtro.limit);
  }

  guardar(criminal: Criminal): Promise<Criminal> {
    return this.repo.save(criminal);
  }

  async existe(id: string): Promise<boolean> {
    return (await this.repo.countBy({ id })) > 0;
  }

  // --- CriminalReaderPort: lo que consumen los otros modulos ---

  async obtenerResumen(id: string): Promise<CriminalResumen | null> {
    const criminal = await this.repo.findOne({
      where: { id },
      select: {
        id: true,
        nombre: true,
        alias: true,
        estado: true,
        nivelAmenaza: true,
        recompensaVigenteMonto: true,
        zonaInfluenciaId: true,
      },
    });

    if (!criminal) return null;

    return {
      id: criminal.id,
      nombre: criminal.nombre,
      alias: criminal.alias ?? [],
      estado: criminal.estado,
      nivelAmenaza: criminal.nivelAmenaza,
      recompensaVigenteMonto: criminal.recompensaVigenteMonto,
      zonaInfluenciaId: criminal.zonaInfluenciaId,
    };
  }
}
