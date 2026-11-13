import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { DomainError } from '../../../shared/domain/errors/domain.error';

export enum EstadoReporte {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
}

export interface Informante {
  nombre?: string;
  contacto?: string;
  anonimo: boolean;
}

/**
 * RF-3. Tabla `reportes_ciudadanos` (clase ReporteCiudadano del diagrama): la
 * entrada NO confiable del centro de inteligencia. Un reporte aprobado se
 * convierte en avistamiento oficial (`avistamiento_id`); uno rechazado conserva
 * el motivo.
 *
 * El endpoint de creacion es el unico @Public() legitimo fuera de auth y
 * archivos: lo usa la ciudadania. Por eso lleva limite de peticiones por IP.
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

  @Column({ name: 'zona_influencia_id', type: 'varchar', length: 36, nullable: true })
  zonaInfluenciaId!: string | null;

  @Column({ type: 'json' })
  informante!: Informante;

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

  // --- Reglas de dominio: un reporte se revisa UNA sola vez ---

  aprobar(usuarioId: string, avistamientoId: string): void {
    this.asegurarPendiente();
    this.estado = EstadoReporte.APROBADO;
    this.revisadoPor = usuarioId;
    this.fechaRevision = new Date();
    this.avistamientoId = avistamientoId;
  }

  rechazar(usuarioId: string, motivo: string | undefined): void {
    this.asegurarPendiente();
    if (!motivo?.trim()) {
      throw new DomainError(
        'Para rechazar un reporte debes indicar el motivo.',
        'MOTIVO_REQUERIDO',
      );
    }
    this.estado = EstadoReporte.RECHAZADO;
    this.revisadoPor = usuarioId;
    this.fechaRevision = new Date();
    this.motivoRechazo = motivo.trim();
  }

  /** Nombre que se registra como testigo al convertirlo en avistamiento. */
  testigo(): string {
    if (this.informante.anonimo) return 'Informante anonimo';
    return this.informante.nombre?.trim() || 'Ciudadano';
  }

  private asegurarPendiente(): void {
    if (this.estado !== EstadoReporte.PENDIENTE) {
      throw new DomainError(`El reporte ya fue revisado (${this.estado}).`, 'REPORTE_YA_REVISADO');
    }
  }
}
