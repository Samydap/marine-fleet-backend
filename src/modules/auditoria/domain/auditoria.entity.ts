import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type { TipoAccionAuditoria } from '../../../shared/domain/auditoria/auditoria.port';

/**
 * RF-7. Tabla `auditoria` (clase Auditoria del diagrama de clases).
 *
 * Es un registro de solo insercion: ningun caso de uso la actualiza ni la
 * borra. Complementa a `criminales_historial`, que la base llena por trigger
 * campo a campo; esta guarda la ACCION de negocio (quien valido que recompensa,
 * desde que IP, si funciono o no).
 */
@Entity('auditoria')
export class Auditoria {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'usuario_id', type: 'varchar', length: 36, nullable: true })
  usuarioId!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  rol!: string | null;

  @Column({ type: 'varchar', length: 80 })
  accion!: string;

  @Column({
    name: 'tipo_accion',
    type: 'enum',
    enum: ['CREACION', 'ACTUALIZACION', 'ELIMINACION_LOGICA', 'CONSULTA', 'AUTENTICACION'],
  })
  tipoAccion!: TipoAccionAuditoria;

  @Column({ type: 'varchar', length: 60, nullable: true })
  entidad!: string | null;

  @Column({ name: 'entidad_id', type: 'varchar', length: 36, nullable: true })
  entidadId!: string | null;

  @Column({ name: 'valor_anterior', type: 'json', nullable: true })
  valorAnterior!: Record<string, unknown> | null;

  @Column({ name: 'valor_nuevo', type: 'json', nullable: true })
  valorNuevo!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  metodo!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ruta!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  exitoso!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  fecha!: Date;
}
