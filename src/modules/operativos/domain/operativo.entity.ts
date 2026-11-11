import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import {
  EstadoOperativo,
  PrioridadOperativo,
  puedeTransicionarOperativo,
} from './estado-operativo.enum';
import { ParticipacionBase } from './participacion-base.entity';

/**
 * RF-4. Tabla `operativos`, creada por la migracion
 * 1731200100000-CreateOperativos: NO existe en database/schema.sql.
 */
@Entity('operativos')
export class Operativo extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  codigo!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ name: 'objetivo_criminal_id', type: 'varchar', length: 36, nullable: true })
  objetivoCriminalId!: string | null;

  @Column({ name: 'zona_influencia_id', type: 'varchar', length: 36 })
  zonaInfluenciaId!: string;

  @Column({ name: 'base_lider_id', type: 'varchar', length: 36 })
  baseLiderId!: string;

  @Column({ type: 'enum', enum: EstadoOperativo, default: EstadoOperativo.PLANIFICADO })
  estado!: EstadoOperativo;

  @Column({ type: 'enum', enum: PrioridadOperativo, default: PrioridadOperativo.MEDIA })
  prioridad!: PrioridadOperativo;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({ name: 'fecha_inicio_planeada', type: 'timestamp', nullable: true })
  fechaInicioPlaneada!: Date | null;

  @Column({ name: 'fecha_inicio_real', type: 'timestamp', nullable: true })
  fechaInicioReal!: Date | null;

  @Column({ name: 'fecha_cierre', type: 'timestamp', nullable: true })
  fechaCierre!: Date | null;

  @Column({ name: 'creado_por', type: 'varchar', length: 36, nullable: true })
  creadoPor!: string | null;

  @OneToMany(() => ParticipacionBase, (participacion) => participacion.operativo)
  bases?: ParticipacionBase[];

  cambiarEstado(nuevoEstado: EstadoOperativo): void {
    if (!puedeTransicionarOperativo(this.estado, nuevoEstado)) {
      throw new DomainError(
        `Transicion de operativo no permitida: ${this.estado} -> ${nuevoEstado}.`,
        'TRANSICION_INVALIDA',
      );
    }

    this.estado = nuevoEstado;
    if (nuevoEstado === EstadoOperativo.EN_CURSO) {
      this.fechaInicioReal = new Date();
    }
    if (nuevoEstado === EstadoOperativo.CERRADO || nuevoEstado === EstadoOperativo.ABORTADO) {
      this.fechaCierre = new Date();
    }
  }
}
