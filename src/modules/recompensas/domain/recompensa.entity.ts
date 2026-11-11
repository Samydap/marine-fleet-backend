import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { EstadoRecompensa } from './estado-recompensa.enum';

/**
 * RF-1/RF-5. Tabla `recompensas`. Es un registro historico inmutable: una
 * recompensa no se edita, se sustituye y la anterior pasa a HISTORICA. Por eso
 * no extiende BaseEntity (no tiene `version` ni `updated_at` en el esquema).
 */
@Entity('recompensas')
export class Recompensa {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'criminal_id', type: 'varchar', length: 36 })
  criminalId!: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  monto!: number;

  @Column({ type: 'varchar', length: 20, default: 'BERRIES' })
  moneda!: string;

  @Column({ type: 'enum', enum: EstadoRecompensa, default: EstadoRecompensa.PENDIENTE_VALIDACION })
  estado!: EstadoRecompensa;

  @Column({ name: 'requiere_validacion', type: 'tinyint', width: 1, default: 0 })
  requiereValidacion!: boolean;

  @Column({ name: 'solicitada_por', type: 'varchar', length: 36, nullable: true })
  solicitadaPor!: string | null;

  @CreateDateColumn({ name: 'fecha_solicitud', type: 'timestamp' })
  fechaSolicitud!: Date;

  @Column({ name: 'validada_por', type: 'varchar', length: 36, nullable: true })
  validadaPor!: string | null;

  @Column({ name: 'fecha_validacion', type: 'timestamp', nullable: true })
  fechaValidacion!: Date | null;

  @Column({ name: 'vigente_desde', type: 'timestamp', nullable: true })
  vigenteDesde!: Date | null;

  @Column({ name: 'vigente_hasta', type: 'timestamp', nullable: true })
  vigenteHasta!: Date | null;

  @Column({ type: 'text', nullable: true })
  motivo!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
