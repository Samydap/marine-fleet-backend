import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export enum EstadoReporte {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
}

/**
 * RF-3. Tabla `reportes_ciudadanos`: la entrada no confiable del centro de
 * inteligencia. Un reporte aprobado se convierte en avistamiento oficial
 * (columna `avistamiento_id`); uno rechazado conserva el motivo.
 *
 * El endpoint de creacion es el unico @Public() legitimo fuera de auth: lo usa
 * la ciudadania. Por eso necesita rate limiting antes de salir a produccion.
 */
@Entity('reportes_ciudadanos')
export class ReporteCiudadano {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'criminal_id', type: 'varchar', length: 36 })
  criminalId!: string;

  @Column({ type: 'text' })
  descripcion!: string;

  @Column({ name: 'fecha_hecho', type: 'timestamp', nullable: true })
  fechaHecho!: Date | null;

  @Column({ type: 'text' })
  ubicacion!: string;

  @Column({ type: 'json' })
  informante!: { nombre?: string; contacto?: string; anonimo: boolean };

  @Column({ type: 'enum', enum: EstadoReporte, default: EstadoReporte.PENDIENTE })
  estado!: EstadoReporte;

  @Column({ name: 'revisado_por', type: 'varchar', length: 36, nullable: true })
  revisadoPor!: string | null;

  @Column({ name: 'fecha_revision', type: 'timestamp', nullable: true })
  fechaRevision!: Date | null;

  @Column({ name: 'motivo_rechazo', type: 'text', nullable: true })
  motivoRechazo!: string | null;

  @Column({ name: 'avistamiento_id', type: 'varchar', length: 36, nullable: true })
  avistamientoId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
