import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type { CriminalNombrado, NombresLookupPort } from '../../domain/lookup/nombres.port';

/** Limite defensivo: una pagina nunca trae mas de 100 filas. */
const MAX_IDS = 500;

function unicos(ids: readonly (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id !== ''))].slice(
    0,
    MAX_IDS,
  );
}

/**
 * Consultas parametrizadas (`IN (?, ?, ...)`): los ids nunca se concatenan en
 * el SQL, solo la cantidad de signos de interrogacion.
 */
@Injectable()
export class SqlNombresLookup implements NombresLookupPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async usuarios(ids: readonly (string | null | undefined)[]): Promise<Map<string, string>> {
    const filas = await this.consultar<{ id: string; nombre: string }>(
      'SELECT id, nombre_completo AS nombre FROM usuarios WHERE id IN',
      ids,
    );
    return new Map(filas.map((f) => [f.id, f.nombre]));
  }

  async criminales(
    ids: readonly (string | null | undefined)[],
  ): Promise<Map<string, CriminalNombrado>> {
    const filas = await this.consultar<{ id: string; nombre: string; foto: unknown }>(
      'SELECT id, nombre, foto FROM criminales WHERE id IN',
      ids,
    );
    return new Map(filas.map((f) => [f.id, { nombre: f.nombre, fotoUrl: this.urlFoto(f.foto) }]));
  }

  async bases(ids: readonly (string | null | undefined)[]): Promise<Map<string, string>> {
    const filas = await this.consultar<{ id: string; nombre: string }>(
      'SELECT id, nombre FROM bases_navales WHERE id IN',
      ids,
    );
    return new Map(filas.map((f) => [f.id, f.nombre]));
  }

  private async consultar<T>(
    sql: string,
    ids: readonly (string | null | undefined)[],
  ): Promise<T[]> {
    const lista = unicos(ids);
    if (lista.length === 0) return [];
    const marcas = lista.map(() => '?').join(', ');
    return (await this.dataSource.query(`${sql} (${marcas})`, lista)) as T[];
  }

  /** La columna JSON llega como objeto (MySQL) o como texto (MariaDB). */
  private urlFoto(foto: unknown): string | null {
    let valor = foto;
    if (typeof valor === 'string') {
      try {
        valor = JSON.parse(valor) as unknown;
      } catch {
        return null;
      }
    }
    const url = (valor as { url?: unknown } | null)?.url;
    return typeof url === 'string' ? url : null;
  }
}
