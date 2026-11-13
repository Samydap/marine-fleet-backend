import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { Criminal } from '../../criminales/domain/criminal.entity';

export enum EstadoVerificacion {
  PENDIENTE = 'PENDIENTE',
  VERIFICADO = 'VERIFICADO',
  DESCARTADO = 'DESCARTADO',
}

export enum OrigenAvistamiento {
  OFICIAL = 'OFICIAL',
  REPORTE_CIUDADANO = 'REPORTE_CIUDADANO',
}

/**
 * RF-3. Tabla `avistamientos` (clase Avistamiento del diagrama).
 *
 * Las columnas testigo, zona, estado de verificacion y origen las agrego la
 * migracion 1731200300000-AmpliarModelo: la v1 solo tenia id, criminal,
 * fecha_hora y ubicacion.
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

  @Column({ type: 'varchar', length: 150, nullable: true })
  testigo!: string | null;

  @Column({ name: 'zona_influencia_id', type: 'varchar', length: 36, nullable: true })
  zonaInfluenciaId!: string | null;

  @Column({
    name: 'estado_verificacion',
    type: 'enum',
    enum: EstadoVerificacion,
    default: EstadoVerificacion.PENDIENTE,
  })
  estadoVerificacion!: EstadoVerificacion;

  @Column({ type: 'enum', enum: OrigenAvistamiento, default: OrigenAvistamiento.OFICIAL })
  origen!: OrigenAvistamiento;

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ name: 'registrado_por', type: 'varchar', length: 36, nullable: true })
  registradoPor!: string | null;

  @Column({ name: 'verificado_por', type: 'varchar', length: 36, nullable: true })
  verificadoPor!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(() => Criminal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'criminal_id' })
  criminal?: Criminal;

  // --- Reglas de dominio ---

  /**
   * Un avistamiento VERIFICADO es inteligencia oficial: no se edita ni se borra.
   * Si resulto falso, se DESCARTA (queda el rastro de que existio).
   */
  asegurarModificable(): void {
    if (this.estadoVerificacion === EstadoVerificacion.VERIFICADO) {
      throw new DomainError(
        'Un avistamiento verificado no se puede modificar ni eliminar: descartalo primero.',
        'AVISTAMIENTO_VERIFICADO',
      );
    }
  }

  cambiarVerificacion(nuevo: EstadoVerificacion, usuarioId: string): void {
    if (nuevo === EstadoVerificacion.PENDIENTE) {
      throw new DomainError('Un avistamiento no vuelve a PENDIENTE.', 'TRANSICION_INVALIDA');
    }
    if (nuevo === this.estadoVerificacion) {
      throw new DomainError(`El avistamiento ya esta ${nuevo}.`, 'TRANSICION_INVALIDA');
    }
    this.estadoVerificacion = nuevo;
    this.verificadoPor = usuarioId;
  }
}
