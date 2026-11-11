import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseNaval, EstadoBase } from './entities/base-naval.entity';
import { Mar, TipoMar } from './entities/mar.entity';
import { ZonaInfluencia } from './entities/zona-influencia.entity';

/**
 * CAPA DELGADA A PROPOSITO (ver ADR 0001).
 *
 * Este modulo es CRUD de lectura sobre catalogos: no tiene reglas de negocio,
 * asi que no lleva puertos ni casos de uso. Aplicarle hexagonal seria ceremonia
 * sin retorno. La asimetria esta documentada para que no se discuta en cada PR.
 */
@Injectable()
export class CatalogosService {
  constructor(
    @InjectRepository(Mar) private readonly mares: Repository<Mar>,
    @InjectRepository(ZonaInfluencia) private readonly zonas: Repository<ZonaInfluencia>,
    @InjectRepository(BaseNaval) private readonly bases: Repository<BaseNaval>,
  ) {}

  listarMares(): Promise<Mar[]> {
    return this.mares.find({ where: { activo: true }, order: { nombre: 'ASC' } });
  }

  listarZonas(marId?: string): Promise<ZonaInfluencia[]> {
    return this.zonas.find({
      where: marId ? { activo: true, marId } : { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  listarBases(zonaInfluenciaId?: string): Promise<BaseNaval[]> {
    return this.bases.find({
      where: zonaInfluenciaId
        ? { estado: EstadoBase.ACTIVA, zonaInfluenciaId }
        : { estado: EstadoBase.ACTIVA },
      order: { nombre: 'ASC' },
    });
  }

  /**
   * Contexto que el motor de clasificacion de amenaza (RF-5) necesita.
   * Lo expone este modulo porque es el dueño de la geografia.
   */
  async obtenerContextoZona(
    zonaInfluenciaId: string,
  ): Promise<{ esGrandLine: boolean; cercanaACuartelGeneral: boolean } | null> {
    const zona = await this.zonas.findOne({ where: { id: zonaInfluenciaId } });
    if (!zona) return null;

    return {
      esGrandLine: zona.mar?.tipo === TipoMar.GRAND_LINE,
      cercanaACuartelGeneral: /sabaody|marineford|mary geoise/i.test(zona.nombre),
    };
  }
}
