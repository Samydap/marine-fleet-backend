import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageResult } from '../../../shared/application/pagination/page-result';
import { Incidente } from '../domain/incidente.entity';
import type {
  FiltroIncidentes,
  IncidenteRepositoryPort,
} from '../domain/incidente.repository.port';
import { Participante } from '../domain/participante.entity';

@Injectable()
export class TypeOrmIncidenteRepository implements IncidenteRepositoryPort {
  constructor(
    @InjectRepository(Incidente) private readonly repo: Repository<Incidente>,
    @InjectRepository(Participante) private readonly participantes: Repository<Participante>,
  ) {}

  buscarPorId(id: string): Promise<Incidente | null> {
    return this.repo.findOne({ where: { id }, relations: { participantes: true } });
  }

  async listar(filtro: FiltroIncidentes): Promise<PageResult<Incidente>> {
    const query = this.repo
      .createQueryBuilder('incidente')
      .leftJoinAndSelect('incidente.participantes', 'participante');

    if (filtro.criminalId) {
      query.andWhere(
        `EXISTS (SELECT 1 FROM incidente_participantes ip
                  WHERE ip.incidente_id = incidente.id AND ip.criminal_id = :criminal)`,
        { criminal: filtro.criminalId },
      );
    }
    if (filtro.baseNavalId) {
      query.andWhere('incidente.base_naval_id = :base', { base: filtro.baseNavalId });
    }
    if (filtro.operativoId) {
      query.andWhere('incidente.operativo_id = :operativo', { operativo: filtro.operativoId });
    }
    if (filtro.tipo) query.andWhere('incidente.tipo = :tipo', { tipo: filtro.tipo });
    if (filtro.desde) query.andWhere('incidente.fecha_hora >= :desde', { desde: filtro.desde });
    if (filtro.hasta) query.andWhere('incidente.fecha_hora <= :hasta', { hasta: filtro.hasta });

    // Con join + skip/take, TypeORM exige el NOMBRE DE PROPIEDAD en orderBy, no la columna.
    const [data, total] = await query
      .orderBy('incidente.fechaHora', filtro.order)
      .skip((filtro.page - 1) * filtro.limit)
      .take(filtro.limit)
      .getManyAndCount();

    return new PageResult(data, total, filtro.page, filtro.limit);
  }

  async guardar(incidente: Incidente): Promise<Incidente> {
    const { participantes } = incidente;
    incidente.participantes = undefined;
    try {
      return await this.repo.save(incidente);
    } finally {
      incidente.participantes = participantes;
    }
  }

  async guardarParticipantes(participantes: Participante[]): Promise<void> {
    if (participantes.length > 0) await this.participantes.save(participantes);
  }
}
