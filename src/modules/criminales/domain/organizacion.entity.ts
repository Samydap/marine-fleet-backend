import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';
import { CategoriaOrganizacion, TipoAgrupacion } from './estado-criminal.enum';
import { Membresia } from './membresia.entity';

/**
 * RF-1. Tabla `organizaciones`: es lo que permite mapear las tres entidades del
 * universo (Piratas, Ejercito Revolucionario y organizaciones criminales
 * independientes) sin crear tres tablas distintas, usando `categoria`.
 */
@Entity('organizaciones')
export class Organizacion extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  nombre!: string;

  @Column({ name: 'tipo_agrupacion', type: 'enum', enum: TipoAgrupacion })
  tipoAgrupacion!: TipoAgrupacion;

  @Column({ type: 'enum', enum: CategoriaOrganizacion })
  categoria!: CategoriaOrganizacion;

  @Column({ name: 'zona_influencia_id', type: 'varchar', length: 36, nullable: true })
  zonaInfluenciaId!: string | null;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  activa!: boolean;

  @OneToMany(() => Membresia, (membresia) => membresia.organizacion)
  membresias?: Membresia[];
}
