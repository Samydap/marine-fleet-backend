import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';
import { Participante } from './participante.entity';
import { ResultadoEnfrentamiento, TipoIncidente } from './resultado-enfrentamiento.enum';

/**
 * RF-6. Tabla `incidentes`, creada por la migracion
 * 1731200200000-CreateIncidentes.
 *
 * No confundir con `criminales_historial`: esa tabla la alimenta un trigger y
 * solo registra cambios de atributos (nombre, estado, recompensa). Esta registra
 * hechos operativos: enfrentamientos, capturas y fugas.
 */
@Entity('incidentes')
export class Incidente extends BaseEntity {
  @Column({ name: 'operativo_id', type: 'varchar', length: 36, nullable: true })
  operativoId!: string | null;

  @Column({ type: 'enum', enum: TipoIncidente })
  tipo!: TipoIncidente;

  @Column({
    type: 'enum',
    enum: ResultadoEnfrentamiento,
    default: ResultadoEnfrentamiento.EN_CURSO,
  })
  resultado!: ResultadoEnfrentamiento;

  @Column({ name: 'fecha_hora', type: 'timestamp' })
  fechaHora!: Date;

  @Column({ type: 'text' })
  ubicacion!: string;

  @Column({ name: 'zona_influencia_id', type: 'varchar', length: 36, nullable: true })
  zonaInfluenciaId!: string | null;

  @Column({ name: 'base_naval_id', type: 'varchar', length: 36, nullable: true })
  baseNavalId!: string | null;

  @Column({ type: 'text' })
  descripcion!: string;

  @Column({ name: 'bajas_marina', type: 'int', default: 0 })
  bajasMarina!: number;

  @Column({ name: 'bajas_enemigas', type: 'int', default: 0 })
  bajasEnemigas!: number;

  @Column({ name: 'registrado_por', type: 'varchar', length: 36, nullable: true })
  registradoPor!: string | null;

  @OneToMany(() => Participante, (participante) => participante.incidente)
  participantes?: Participante[];
}
