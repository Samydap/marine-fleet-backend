import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';
import { Criminal } from './criminal.entity';

/** RF-1. Tabla `antecedentes`: delitos registrados de un criminal. */
@Entity('antecedentes')
export class Antecedente extends BaseEntity {
  @Column({ name: 'criminal_id', type: 'varchar', length: 36 })
  criminalId!: string;

  @Column({ name: 'tipo_delito', type: 'varchar', length: 100 })
  tipoDelito!: string;

  @Column({ type: 'text' })
  descripcion!: string;

  @Column({ name: 'fecha_hecho', type: 'timestamp', nullable: true })
  fechaHecho!: Date | null;

  @Column({ type: 'text', nullable: true })
  ubicacion!: string | null;

  @Column({ name: 'registrado_por', type: 'varchar', length: 36, nullable: true })
  registradoPor!: string | null;

  @ManyToOne(() => Criminal, (criminal) => criminal.antecedentes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'criminal_id' })
  criminal?: Criminal;
}
