import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Criminal } from './criminal.entity';
import { RolMembresia } from './estado-criminal.enum';
import { Organizacion } from './organizacion.entity';

/**
 * RF-1. Tabla `membresias`: afiliacion de un criminal a una organizacion.
 * No extiende BaseEntity porque el esquema no le da columnas `version` ni
 * `updated_at`: es un registro historico, se cierra con `fecha_salida`.
 */
@Entity('membresias')
export class Membresia {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'criminal_id', type: 'varchar', length: 36 })
  criminalId!: string;

  @Column({ name: 'organizacion_id', type: 'varchar', length: 36 })
  organizacionId!: string;

  @Column({ type: 'enum', enum: RolMembresia })
  rol!: RolMembresia;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  vigente!: boolean;

  @Column({ name: 'fecha_ingreso', type: 'timestamp', nullable: true })
  fechaIngreso!: Date | null;

  @Column({ name: 'fecha_salida', type: 'timestamp', nullable: true })
  fechaSalida!: Date | null;

  @Column({ name: 'creado_por', type: 'varchar', length: 36, nullable: true })
  creadoPor!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(() => Criminal, (criminal) => criminal.membresias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'criminal_id' })
  criminal?: Criminal;

  @ManyToOne(() => Organizacion, (organizacion) => organizacion.membresias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizacion_id' })
  organizacion?: Organizacion;

  cerrar(fecha: Date = new Date()): void {
    this.vigente = false;
    this.fechaSalida = fecha;
  }
}
