import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Operativo } from './operativo.entity';

/**
 * RF-4. Tabla `operativo_responsables` (migracion AmpliarModelo): los marines
 * (usuarios del sistema) responsables de un operativo y su funcion.
 */
@Entity('operativo_responsables')
export class ResponsableOperativo {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'operativo_id', type: 'varchar', length: 36 })
  operativoId!: string;

  @Column({ name: 'usuario_id', type: 'varchar', length: 36 })
  usuarioId!: string;

  @Column({ type: 'varchar', length: 100, default: 'RESPONSABLE' })
  funcion!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(() => Operativo, (operativo) => operativo.responsables, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'operativo_id' })
  operativo?: Operativo;
}
