import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Operativo } from './operativo.entity';
import { RolParticipacion } from './estado-operativo.enum';

/**
 * RF-4. Tabla `operativo_bases`: es la coordinacion propiamente dicha, la base
 * naval que participa en un operativo y con que rol.
 */
@Entity('operativo_bases')
export class ParticipacionBase {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'operativo_id', type: 'varchar', length: 36 })
  operativoId!: string;

  @Column({ name: 'base_naval_id', type: 'varchar', length: 36 })
  baseNavalId!: string;

  @Column({ name: 'rol_participacion', type: 'enum', enum: RolParticipacion })
  rolParticipacion!: RolParticipacion;

  @Column({ name: 'unidades_asignadas', type: 'int', default: 0 })
  unidadesAsignadas!: number;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  confirmada!: boolean;

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(() => Operativo, (operativo) => operativo.bases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'operativo_id' })
  operativo?: Operativo;
}
