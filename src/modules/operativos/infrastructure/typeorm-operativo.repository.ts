import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { PageResult } from '../../../shared/application/pagination/page-result';
import { Operativo } from '../domain/operativo.entity';
import type {
  FiltroOperativos,
  OperativoReaderPort,
  OperativoRepositoryPort,
  OperativoResumen,
} from '../domain/operativo.repository.port';
import { ParticipacionBase } from '../domain/participacion-base.entity';
import { ResponsableOperativo } from '../domain/responsable-operativo.entity';

/** Adaptador TypeORM del agregado Operativo. Implementa el puerto interno y el publico. */
@Injectable()
export class TypeOrmOperativoRepository implements OperativoRepositoryPort, OperativoReaderPort {
  constructor(
    @InjectRepository(Operativo) private readonly repo: Repository<Operativo>,
    @InjectRepository(ParticipacionBase)
    private readonly participaciones: Repository<ParticipacionBase>,
    @InjectRepository(ResponsableOperativo)
    private readonly responsables: Repository<ResponsableOperativo>,
  ) {}

  buscarPorId(id: string): Promise<Operativo | null> {
    return this.repo.findOne({ where: { id }, relations: { bases: true, responsables: true } });
  }

  async listar(filtro: FiltroOperativos): Promise<PageResult<Operativo>> {
    const query = this.repo
      .createQueryBuilder('operativo')
      .leftJoinAndSelect('operativo.bases', 'participacion');

    if (filtro.q) {
      query.andWhere('(operativo.nombre LIKE :q OR operativo.codigo LIKE :q)', {
        q: `%${filtro.q}%`,
      });
    }
    if (filtro.estado) query.andWhere('operativo.estado = :estado', { estado: filtro.estado });
    if (filtro.prioridad) {
      query.andWhere('operativo.prioridad = :prioridad', { prioridad: filtro.prioridad });
    }
    if (filtro.criminalId) {
      query.andWhere('operativo.objetivo_criminal_id = :criminal', { criminal: filtro.criminalId });
    }
    for (const [nombre, base] of [
      ['filtroBase', filtro.baseNavalId],
      ['alcanceBase', filtro.alcanceBaseId],
    ] as const) {
      if (!base) continue;
      query.andWhere(
        new Brackets((w) =>
          w.where(`operativo.base_lider_id = :${nombre}`).orWhere(
            `EXISTS (SELECT 1 FROM operativo_bases ob
                      WHERE ob.operativo_id = operativo.id AND ob.base_naval_id = :${nombre})`,
          ),
        ),
        { [nombre]: base },
      );
    }

    // Con join + skip/take, TypeORM exige el NOMBRE DE PROPIEDAD en orderBy, no la columna.
    const [data, total] = await query
      .orderBy('operativo.createdAt', filtro.order)
      .skip((filtro.page - 1) * filtro.limit)
      .take(filtro.limit)
      .getManyAndCount();

    return new PageResult(data, total, filtro.page, filtro.limit);
  }

  /**
   * Guarda solo la fila del operativo: bases y responsables tienen su propio
   * metodo. Se retiran las relaciones durante el save para que TypeORM no
   * intente sincronizarlas, y se restauran despues.
   */
  async guardar(operativo: Operativo): Promise<Operativo> {
    const { bases, responsables } = operativo;
    operativo.bases = undefined;
    operativo.responsables = undefined;
    try {
      return await this.repo.save(operativo);
    } finally {
      operativo.bases = bases;
      operativo.responsables = responsables;
    }
  }

  async guardarParticipaciones(participaciones: ParticipacionBase[]): Promise<void> {
    await this.participaciones.save(participaciones);
  }

  async guardarResponsables(responsables: ResponsableOperativo[]): Promise<void> {
    await this.responsables.save(responsables);
  }

  async contarDelAnio(anio: number): Promise<number> {
    return this.repo
      .createQueryBuilder('operativo')
      .where('operativo.codigo LIKE :prefijo', { prefijo: `OP-${anio}-%` })
      .getCount();
  }

  async contarIncidentesVinculados(operativoId: string): Promise<number> {
    const filas = (await this.repo.query(
      'SELECT COUNT(*) AS total FROM incidentes WHERE operativo_id = ?',
      [operativoId],
    )) as Array<{ total: number | string }>;
    return Number(filas[0]?.total ?? 0);
  }

  async obtenerResumen(id: string): Promise<OperativoResumen | null> {
    const operativo = await this.buscarPorId(id);
    if (!operativo) return null;
    return {
      id: operativo.id,
      codigo: operativo.codigo,
      estado: operativo.estado,
      basesIds: operativo.basesInvolucradas(),
    };
  }
}
