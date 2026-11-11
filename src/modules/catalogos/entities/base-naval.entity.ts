import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';
import { ZonaInfluencia } from './zona-influencia.entity';

export enum EstadoBase {
  ACTIVA = 'ACTIVA',
  INACTIVA = 'INACTIVA',
}

/** Tabla `bases_navales`. */
@Entity('bases_navales')
export class BaseNaval extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  nombre!: string;

  @Column({ name: 'zona_influencia_id', type: 'varchar', length: 36 })
  zonaInfluenciaId!: string;

  @Column({ type: 'text' })
  ubicacion!: string;

  @Column({ name: 'comandante_nombre', type: 'varchar', length: 150 })
  comandanteNombre!: string;

  @Column({ type: 'enum', enum: EstadoBase, default: EstadoBase.ACTIVA })
  estado!: EstadoBase;

  @ManyToOne(() => ZonaInfluencia, { eager: true })
  @JoinColumn({ name: 'zona_influencia_id' })
  zonaInfluencia?: ZonaInfluencia;
}
