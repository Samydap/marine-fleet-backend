import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { ReferenciasOperativoPort } from '../domain/operativo.repository.port';
import type { BaseCandidata } from '../domain/politica-asignacion';

interface FilaBase {
  id: string;
  zona_influencia_id: string;
  estado: string;
}

/**
 * Lee bases navales, zonas y usuarios con SQL parametrizado. Son tablas de los
 * modulos Catalogos y Usuarios: aqui solo se LEEN, y por eso este adaptador no
 * importa sus entidades ni sus repositorios.
 */
@Injectable()
export class TypeOrmReferenciasOperativoAdapter implements ReferenciasOperativoPort {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async obtenerBases(ids: readonly string[]): Promise<BaseCandidata[]> {
    if (ids.length === 0) return [];
    const filas = (await this.db.query(
      `SELECT id, zona_influencia_id, estado FROM bases_navales WHERE id IN (${ids.map(() => '?').join(',')})`,
      [...ids],
    )) as FilaBase[];
    return filas.map((f) => this.aCandidata(f));
  }

  async listarBasesActivas(): Promise<BaseCandidata[]> {
    const filas = (await this.db.query(
      `SELECT id, zona_influencia_id, estado FROM bases_navales WHERE estado = 'ACTIVA' ORDER BY nombre`,
    )) as FilaBase[];
    return filas.map((f) => this.aCandidata(f));
  }

  async usuariosActivos(ids: readonly string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const filas = (await this.db.query(
      `SELECT id FROM usuarios WHERE estado = 'ACTIVO' AND id IN (${ids.map(() => '?').join(',')})`,
      [...ids],
    )) as Array<{ id: string }>;
    return filas.map((f) => f.id);
  }

  async zonaExiste(zonaId: string): Promise<boolean> {
    const filas = (await this.db.query(
      'SELECT COUNT(*) AS total FROM zonas_influencia WHERE id = ?',
      [zonaId],
    )) as Array<{ total: number | string }>;
    return Number(filas[0]?.total ?? 0) > 0;
  }

  private aCandidata(fila: FilaBase): BaseCandidata {
    return {
      id: fila.id,
      zonaInfluenciaId: fila.zona_influencia_id,
      activa: fila.estado === 'ACTIVA',
    };
  }
}
