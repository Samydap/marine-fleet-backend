import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, type SelectQueryBuilder } from 'typeorm';
import { PageResult } from '../../../shared/application/pagination/page-result';
import { Criminal } from '../domain/criminal.entity';
import type {
  CriminalNivelWriterPort,
  CriminalReaderPort,
  CriminalRepositoryPort,
  CriminalResumen,
  FiltroCriminales,
} from '../domain/criminal.repository.port';
import { NivelAmenaza } from '../domain/estado-criminal.enum';

/**
 * ADAPTADOR DE REFERENCIA. Implementa los tres puertos del modulo (escritura
 * propia, lectura para otros modulos y la escritura acotada del nivel de
 * amenaza) y es el unico archivo del slice que conoce TypeORM.
 */
@Injectable()
export class TypeOrmCriminalRepository
  implements CriminalRepositoryPort, CriminalReaderPort, CriminalNivelWriterPort
{
  constructor(
    @InjectRepository(Criminal)
    private readonly repo: Repository<Criminal>,
  ) {}

  buscarPorId(id: string): Promise<Criminal | null> {
    return this.repo.findOne({
      where: { id },
      relations: { membresias: { organizacion: true } },
    });
  }

  buscarPorNombreNormalizado(nombreNormalizado: string): Promise<Criminal | null> {
    return this.repo.findOne({ where: { nombreNormalizado } });
  }

  async listar(filtro: FiltroCriminales): Promise<PageResult<Criminal>> {
    const query = this.repo
      .createQueryBuilder('criminal')
      .leftJoinAndSelect('criminal.membresias', 'membresia', 'membresia.vigente = 1')
      .leftJoinAndSelect('membresia.organizacion', 'organizacion');

    this.aplicarFiltros(query, filtro);

    const [data, total] = await query
      // Con joins + skip/take, TypeORM exige nombres de PROPIEDAD en el orderBy, no de columna.
      .orderBy('criminal.recompensaVigenteMonto', filtro.order)
      .addOrderBy('criminal.nombre', 'ASC')
      .skip((filtro.page - 1) * filtro.limit)
      .take(filtro.limit)
      .getManyAndCount();

    return new PageResult(data, total, filtro.page, filtro.limit);
  }

  /** Siempre parametrizado: nunca se interpola texto del usuario en el SQL. */
  private aplicarFiltros(query: SelectQueryBuilder<Criminal>, filtro: FiltroCriminales): void {
    if (filtro.q) {
      query.andWhere(
        '(criminal.nombre LIKE :q OR criminal.nombre_normalizado LIKE :q ' +
          'OR LOWER(CAST(criminal.alias AS CHAR)) LIKE :qmin)',
        { q: `%${filtro.q}%`, qmin: `%${filtro.q.toLowerCase()}%` },
      );
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
    if (filtro.recompensaMin !== undefined) {
      query.andWhere('criminal.recompensa_vigente_monto >= :min', { min: filtro.recompensaMin });
    }
    if (filtro.recompensaMax !== undefined) {
      query.andWhere('criminal.recompensa_vigente_monto <= :max', { max: filtro.recompensaMax });
    }
    // Afiliacion con EXISTS: filtrar por el join de arriba recortaria las
    // membresias que se devuelven en la respuesta.
    if (filtro.organizacionId) {
      query.andWhere(
        'EXISTS (SELECT 1 FROM membresias mf WHERE mf.criminal_id = criminal.id ' +
          'AND mf.vigente = 1 AND mf.organizacion_id = :org)',
        { org: filtro.organizacionId },
      );
    }
    if (filtro.categoria) {
      query.andWhere(
        'EXISTS (SELECT 1 FROM membresias mc INNER JOIN organizaciones oc ' +
          'ON oc.id = mc.organizacion_id WHERE mc.criminal_id = criminal.id ' +
          'AND mc.vigente = 1 AND oc.categoria = :categoria)',
        { categoria: filtro.categoria },
      );
    }
  }

  guardar(criminal: Criminal): Promise<Criminal> {
    return this.repo.save(criminal);
  }

  async existe(id: string): Promise<boolean> {
    return (await this.repo.countBy({ id })) > 0;
  }

  // --- CriminalReaderPort: lo que consumen los otros modulos ---

  async obtenerResumen(id: string): Promise<CriminalResumen | null> {
    const criminal = await this.buscarPorId(id);
    return criminal ? this.aResumen(criminal) : null;
  }

  async obtenerResumenes(ids: readonly string[]): Promise<CriminalResumen[]> {
    if (ids.length === 0) return [];
    const criminales = await this.repo.find({
      where: { id: In([...new Set(ids)]) },
      relations: { membresias: { organizacion: true } },
    });
    return criminales.map((c) => this.aResumen(c));
  }

  async listarTodosLosIds(): Promise<string[]> {
    const filas = await this.repo.find({ select: { id: true }, order: { id: 'ASC' } });
    return filas.map((f) => f.id);
  }

  async contarPorNivelAmenaza(
    soloActivos: boolean,
  ): Promise<Array<{ nivel: NivelAmenaza; total: number }>> {
    const query = this.repo
      .createQueryBuilder('criminal')
      .select('criminal.nivel_amenaza', 'nivel')
      .addSelect('COUNT(*)', 'total')
      .groupBy('criminal.nivel_amenaza');
    if (soloActivos) {
      query.where('criminal.estado = :estado', { estado: 'ACTIVO' });
    }
    const filas = await query.getRawMany<{ nivel: NivelAmenaza; total: string | number }>();

    // Siempre los cuatro niveles, aunque alguno tenga cero: el grafico no salta.
    return Object.values(NivelAmenaza).map((nivel) => ({
      nivel,
      total: Number(filas.find((f) => f.nivel === nivel)?.total ?? 0),
    }));
  }

  // --- CriminalNivelWriterPort: la unica escritura que hace Amenaza ---

  async actualizarNivelAmenaza(
    criminalId: string,
    nivel: NivelAmenaza,
    usuarioId: string | null,
  ): Promise<NivelAmenaza | null> {
    const actual = await this.repo.findOne({
      where: { id: criminalId },
      select: { id: true, nivelAmenaza: true },
    });
    if (!actual) return null;

    if (actual.nivelAmenaza !== nivel) {
      // update() y no save(): es un cambio del sistema, no debe mover la
      // `version` que el usuario tiene en pantalla. El trigger igual lo registra.
      await this.repo.update(
        { id: criminalId },
        { nivelAmenaza: nivel, actualizadoPor: usuarioId },
      );
    }
    return actual.nivelAmenaza;
  }

  private aResumen(criminal: Criminal): CriminalResumen {
    const principal = criminal.membresiaPrincipal();
    return {
      id: criminal.id,
      nombre: criminal.nombre,
      alias: criminal.alias ?? [],
      estado: criminal.estado,
      nivelAmenaza: criminal.nivelAmenaza,
      recompensaVigenteMonto: criminal.recompensaVigenteMonto,
      zonaInfluenciaId: criminal.zonaInfluenciaId,
      fotoUrl: criminal.foto?.url ?? null,
      organizacion:
        principal && principal.organizacion
          ? {
              id: principal.organizacion.id,
              nombre: principal.organizacion.nombre,
              categoria: principal.organizacion.categoria,
              rol: principal.rol,
            }
          : null,
    };
  }
}
