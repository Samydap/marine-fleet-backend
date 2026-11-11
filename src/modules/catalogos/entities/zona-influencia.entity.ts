import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Mar } from './mar.entity';

/**
 * Tabla `zonas_influencia`. Es la dimension geografica que alimenta la
 * clasificacion de amenaza (RF-5) y la asignacion de bases a operativos (RF-4).
 */
@Entity('zonas_influencia')
export class ZonaInfluencia {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'mar_id', type: 'varchar', length: 36 })
  marId!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  activo!: boolean;

  @ManyToOne(() => Mar, { eager: true })
  @JoinColumn({ name: 'mar_id' })
  mar?: Mar;
}
