import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { PageResult } from '../../../shared/application/pagination/page-result';
import type {
  AuditoriaWriterPort,
  RegistroAuditoria,
} from '../../../shared/domain/auditoria/auditoria.port';
import { Auditoria } from '../domain/auditoria.entity';
import type { AuditoriaRepositoryPort, FiltroAuditoria } from '../domain/auditoria.repository.port';

/** Tamano maximo de un valor guardado en la bitacora: evita filas de megabytes. */
const MAX_JSON = 20_000;

@Injectable()
export class TypeOrmAuditoriaRepository implements AuditoriaWriterPort, AuditoriaRepositoryPort {
  private readonly logger = new Logger('Auditoria');

  constructor(@InjectRepository(Auditoria) private readonly repo: Repository<Auditoria>) {}

  /**
   * Nunca lanza: si la bitacora falla, la operacion de negocio ya ocurrio y no
   * debe revertirse por eso. El fallo queda en el log del servidor.
   */
  async registrar(registro: RegistroAuditoria): Promise<void> {
    try {
      const fila = Object.assign(new Auditoria(), {
        id: randomUUID(),
        usuarioId: registro.usuarioId,
        rol: registro.rol,
        accion: registro.accion.slice(0, 80),
        tipoAccion: registro.tipoAccion,
        entidad: registro.entidad,
        entidadId: registro.entidadId?.slice(0, 36) ?? null,
        valorAnterior: this.recortar(registro.valorAnterior),
        valorNuevo: this.recortar(registro.valorNuevo),
        metodo: registro.metodo ?? null,
        ruta: registro.ruta?.slice(0, 255) ?? null,
        ip: registro.ip?.slice(0, 64) ?? null,
        exitoso: registro.exitoso,
      });
      await this.repo.save(fila, { reload: false });
    } catch (error) {
      this.logger.error(`No se pudo registrar la auditoria de ${registro.accion}`, String(error));
    }
  }

  async listar(filtro: FiltroAuditoria): Promise<PageResult<Auditoria>> {
    const query = this.repo.createQueryBuilder('a');

    if (filtro.usuarioId) query.andWhere('a.usuario_id = :u', { u: filtro.usuarioId });
    if (filtro.accion) query.andWhere('a.accion = :accion', { accion: filtro.accion });
    if (filtro.entidad) query.andWhere('a.entidad = :entidad', { entidad: filtro.entidad });
    if (filtro.entidadId) query.andWhere('a.entidad_id = :eid', { eid: filtro.entidadId });
    if (filtro.exitoso !== undefined)
      query.andWhere('a.exitoso = :ok', { ok: filtro.exitoso ? 1 : 0 });
    if (filtro.desde) query.andWhere('a.fecha >= :desde', { desde: filtro.desde });
    if (filtro.hasta) query.andWhere('a.fecha <= :hasta', { hasta: filtro.hasta });

    const [data, total] = await query
      .orderBy('a.fecha', filtro.order)
      .skip((filtro.page - 1) * filtro.limit)
      .take(filtro.limit)
      .getManyAndCount();

    return new PageResult(data, total, filtro.page, filtro.limit);
  }

  private recortar(valor: unknown): Record<string, unknown> | null {
    if (valor === undefined || valor === null) return null;
    const json = JSON.stringify(valor);
    if (json.length > MAX_JSON) return { truncado: true, inicio: json.slice(0, 500) };
    return typeof valor === 'object' && !Array.isArray(valor)
      ? (valor as Record<string, unknown>)
      : { valor };
  }
}
