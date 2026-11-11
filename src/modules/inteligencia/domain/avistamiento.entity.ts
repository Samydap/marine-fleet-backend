import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Criminal } from '../../criminales/domain/criminal.entity';

/**
 * RF-3. Tabla `avistamientos`.
 *
 * OJO: el esquema real solo tiene id, criminal_id, fecha_hora y ubicacion. No
 * tiene `testigo` ni `verificado`, aunque la version 1 del frontend los
 * insinuaba. Si el equipo los necesita, van por migracion, no agregando
 * columnas a esta entidad sin tocar la base.
 */
@Entity('avistamientos')
export class Avistamiento {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'criminal_id', type: 'varchar', length: 36 })
  criminalId!: string;

  @Column({ name: 'fecha_hora', type: 'timestamp' })
  fechaHora!: Date;

  @Column({ type: 'text' })
  ubicacion!: string;

  @ManyToOne(() => Criminal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'criminal_id' })
  criminal?: Criminal;
}
