import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PageResult } from '../../../shared/application/pagination/page-result';
import type {
  EntradaHistorial,
  FiltroHistorial,
  HistorialCriminalRepositoryPort,
} from '../domain/historial.repository.port';

interface FilaHistorial {
  id: number | string;
  criminal_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  usuario_id: string | null;
  usuario_nombre: string | null;
  fecha: Date;
}

/**
 * Lee `criminales_historial`. No hay entidad TypeORM a proposito: la tabla la
 * llenan triggers de la base y la aplicacion nunca escribe en ella.
 */
@Injectable()
export class TypeOrmHistorialRepository implements HistorialCriminalRepositoryPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listar(filtro: FiltroHistorial): Promise<PageResult<EntradaHistorial>> {
    const condiciones = ['h.criminal_id = ?'];
    const parametros: unknown[] = [filtro.criminalId];
    if (filtro.campo) {
      condiciones.push('h.campo LIKE ?');
      parametros.push(`${filtro.campo}%`);
    }
    const where = condiciones.join(' AND ');

    const [conteo] = (await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM criminales_historial h WHERE ${where}`,
      parametros,
    )) as Array<{ total: number | string }>;

    const filas = (await this.dataSource.query(
      `SELECT h.id, h.criminal_id, h.campo, h.valor_anterior, h.valor_nuevo, h.usuario_id,
              u.nombre_completo AS usuario_nombre, h.fecha
         FROM criminales_historial h
         LEFT JOIN usuarios u ON u.id = h.usuario_id
        WHERE ${where}
        ORDER BY h.fecha DESC, h.id DESC
        LIMIT ? OFFSET ?`,
      [...parametros, filtro.limit, (filtro.page - 1) * filtro.limit],
    )) as FilaHistorial[];

    const data = filas.map((f): EntradaHistorial => ({
      id: Number(f.id),
      criminalId: f.criminal_id,
      campo: f.campo,
      valorAnterior: f.valor_anterior,
      valorNuevo: f.valor_nuevo,
      usuarioId: f.usuario_id,
      usuarioNombre: f.usuario_nombre,
      fecha: f.fecha,
    }));
    return new PageResult(data, Number(conteo?.total ?? 0), filtro.page, filtro.limit);
  }
}
