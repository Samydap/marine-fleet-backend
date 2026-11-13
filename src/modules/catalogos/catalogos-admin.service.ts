import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { ConcurrencyError } from '../../shared/domain/errors/concurrency.error';
import { DomainError } from '../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../shared/domain/errors/not-found.error';
import type {
  ActualizarBaseNavalDto,
  ActualizarMarDto,
  ActualizarZonaDto,
  CrearBaseNavalDto,
  CrearMarDto,
  CrearZonaDto,
} from './dto/catalogos.dto';
import { BaseNaval, EstadoBase } from './entities/base-naval.entity';
import { Mar } from './entities/mar.entity';
import { ZonaInfluencia } from './entities/zona-influencia.entity';

export interface DetalleBaseNaval {
  base: BaseNaval;
  usuariosAsignados: Array<{ id: string; nombreCompleto: string; rol: string; estado: string }>;
  operativosActivos: number;
}

/**
 * Administracion de catalogos: "administrar el catalogo de mares y zonas de
 * influencia" y "registrar las bases navales existentes, incluyendo su
 * ubicacion, zona de influencia marina y comandante a cargo".
 *
 * CAPA DELGADA a proposito (ADR 0001): es CRUD sin reglas de negocio, asi que
 * no lleva puertos ni casos de uso. Las unicas validaciones son de integridad
 * (que el mar o la zona referida exista) y la concurrencia optimista de bases.
 * Nada se borra: se desactiva (activo = 0 / estado INACTIVA) para no romper el
 * historial que referencia el registro.
 */
@Injectable()
export class CatalogosAdminService {
  constructor(
    @InjectRepository(Mar) private readonly mares: Repository<Mar>,
    @InjectRepository(ZonaInfluencia) private readonly zonas: Repository<ZonaInfluencia>,
    @InjectRepository(BaseNaval) private readonly bases: Repository<BaseNaval>,
  ) {}

  crearMar(dto: CrearMarDto): Promise<Mar> {
    return this.mares.save(
      Object.assign(new Mar(), { ...dto, id: dto.id ?? randomUUID(), activo: true }),
    );
  }

  async actualizarMar(id: string, dto: ActualizarMarDto): Promise<Mar> {
    const mar = await this.mares.findOne({ where: { id } });
    if (!mar) throw new NotFoundError('mar', id);
    return this.mares.save(Object.assign(mar, dto));
  }

  async crearZona(dto: CrearZonaDto): Promise<ZonaInfluencia> {
    await this.asegurarMar(dto.marId);
    const zona = Object.assign(new ZonaInfluencia(), {
      ...dto,
      id: dto.id ?? randomUUID(),
      descripcion: dto.descripcion ?? null,
      activo: true,
    });
    await this.zonas.save(zona);
    return this.obtenerZona(zona.id);
  }

  async actualizarZona(id: string, dto: ActualizarZonaDto): Promise<ZonaInfluencia> {
    const zona = await this.obtenerZona(id);
    if (dto.marId) await this.asegurarMar(dto.marId);
    // Se suelta la relacion cargada para que TypeORM use el mar_id nuevo.
    await this.zonas.save(Object.assign(zona, dto, { mar: undefined }));
    return this.obtenerZona(id);
  }

  async crearBase(dto: CrearBaseNavalDto): Promise<BaseNaval> {
    await this.asegurarZona(dto.zonaInfluenciaId);
    const base = Object.assign(new BaseNaval(), {
      ...dto,
      id: dto.id ?? randomUUID(),
      estado: EstadoBase.ACTIVA,
    });
    await this.bases.save(base);
    return this.obtenerBase(base.id);
  }

  async actualizarBase(id: string, dto: ActualizarBaseNavalDto): Promise<BaseNaval> {
    const { version, ...cambios } = dto;
    const base = await this.obtenerBase(id);
    if (version !== undefined && Number(base.version) !== version) {
      throw new ConcurrencyError('base naval', id, version);
    }
    if (cambios.zonaInfluenciaId) await this.asegurarZona(cambios.zonaInfluenciaId);
    await this.bases.save(Object.assign(base, cambios, { zonaInfluencia: undefined }));
    return this.obtenerBase(id);
  }

  async detalleBase(id: string): Promise<DetalleBaseNaval> {
    const base = await this.obtenerBase(id);
    const usuarios = (await this.bases.query(
      `SELECT u.id, u.nombre_completo AS nombreCompleto, r.codigo AS rol, u.estado
         FROM usuarios u JOIN roles r ON r.id = u.rol_id
        WHERE u.base_naval_id = ? ORDER BY u.nombre_completo`,
      [id],
    )) as DetalleBaseNaval['usuariosAsignados'];
    const operativos = (await this.bases.query(
      `SELECT COUNT(DISTINCT o.id) AS total FROM operativos o
         LEFT JOIN operativo_bases ob ON ob.operativo_id = o.id
        WHERE o.estado IN ('PLANIFICADO','EN_CURSO')
          AND (o.base_lider_id = ? OR ob.base_naval_id = ?)`,
      [id, id],
    )) as Array<{ total: number | string }>;

    return {
      base,
      usuariosAsignados: usuarios,
      operativosActivos: Number(operativos[0]?.total ?? 0),
    };
  }

  private async obtenerZona(id: string): Promise<ZonaInfluencia> {
    const zona = await this.zonas.findOne({ where: { id } });
    if (!zona) throw new NotFoundError('zona de influencia', id);
    return zona;
  }

  private async obtenerBase(id: string): Promise<BaseNaval> {
    const base = await this.bases.findOne({ where: { id } });
    if (!base) throw new NotFoundError('base naval', id);
    return base;
  }

  private async asegurarMar(id: string): Promise<void> {
    if ((await this.mares.countBy({ id })) === 0) throw new NotFoundError('mar', id);
  }

  private async asegurarZona(id: string): Promise<void> {
    const zona = await this.zonas.findOne({ where: { id } });
    if (!zona) throw new NotFoundError('zona de influencia', id);
    if (!zona.activo) {
      throw new DomainError('La zona de influencia esta inactiva.', 'ZONA_INACTIVA');
    }
  }
}
