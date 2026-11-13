import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * Tabla `notificaciones` (migracion AmpliarModelo). Aviso persistente para una
 * base naval (o global si `base_naval_id` es null). Complementa el canal SSE:
 * si la base no estaba conectada cuando ocurrio el cambio, lo ve al entrar.
 *
 * `leida` es por notificacion, no por usuario: la notificacion es de la base.
 */
@Entity('notificaciones')
export class Notificacion {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'base_naval_id', type: 'varchar', length: 36, nullable: true })
  baseNavalId!: string | null;

  @Column({ name: 'usuario_id', type: 'varchar', length: 36, nullable: true })
  usuarioId!: string | null;

  @Column({ type: 'varchar', length: 60 })
  tipo!: string;

  @Column({ type: 'varchar', length: 150 })
  titulo!: string;

  @Column({ type: 'text' })
  mensaje!: string;

  @Column({ name: 'referencia_tipo', type: 'varchar', length: 40, nullable: true })
  referenciaTipo!: string | null;

  @Column({ name: 'referencia_id', type: 'varchar', length: 36, nullable: true })
  referenciaId!: string | null;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  leida!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
