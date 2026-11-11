import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Incidente } from './incidente.entity';
import { DesenlaceParticipante, RolEnIncidente } from './resultado-enfrentamiento.enum';

/** RF-6. Tabla `incidente_participantes`: criminales involucrados y su desenlace. */
@Entity('incidente_participantes')
export class Participante {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'incidente_id', type: 'varchar', length: 36 })
  incidenteId!: string;

  @Column({ name: 'criminal_id', type: 'varchar', length: 36 })
  criminalId!: string;

  @Column({ name: 'rol_en_incidente', type: 'enum', enum: RolEnIncidente })
  rolEnIncidente!: RolEnIncidente;

  @Column({ type: 'enum', enum: DesenlaceParticipante, default: DesenlaceParticipante.DESCONOCIDO })
  desenlace!: DesenlaceParticipante;

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(() => Incidente, (incidente) => incidente.participantes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incidente_id' })
  incidente?: Incidente;
}
