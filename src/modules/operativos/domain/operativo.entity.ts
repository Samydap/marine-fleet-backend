import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import {
  EstadoOperativo,
  PrioridadOperativo,
  ResultadoOperativo,
  RolParticipacion,
  esEstadoFinal,
  puedeTransicionarOperativo,
} from './estado-operativo.enum';
import { ParticipacionBase } from './participacion-base.entity';
import { ResponsableOperativo } from './responsable-operativo.entity';

/**
 * RF-4. Tabla `operativos` (migraciones CreateOperativos + AmpliarModelo).
 * Clase `Operativo` del diagrama de clases.
 *
 * Las reglas de ciclo de vida viven aqui y no en el controller: transiciones de
 * estado, que solo se puede editar un operativo no finalizado y que el cierre
 * exige resultado.
 */
@Entity('operativos')
export class Operativo extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  codigo!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ name: 'objetivo_criminal_id', type: 'varchar', length: 36, nullable: true })
  objetivoCriminalId!: string | null;

  /** Objetivo de la mision en texto (que se busca lograr). */
  @Column({ type: 'text', nullable: true })
  objetivo!: string | null;

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

  @Column({ name: 'resultado_final', type: 'enum', enum: ResultadoOperativo, nullable: true })
  resultadoFinal!: ResultadoOperativo | null;

  @Column({ name: 'observaciones_cierre', type: 'text', nullable: true })
  observacionesCierre!: string | null;

  @Column({ name: 'creado_por', type: 'varchar', length: 36, nullable: true })
  creadoPor!: string | null;

  @OneToMany(() => ParticipacionBase, (participacion) => participacion.operativo)
  bases?: ParticipacionBase[];

  @OneToMany(() => ResponsableOperativo, (responsable) => responsable.operativo)
  responsables?: ResponsableOperativo[];

  // --- Comportamiento de dominio ---

  cambiarEstado(nuevoEstado: EstadoOperativo): void {
    if (nuevoEstado === EstadoOperativo.CERRADO) {
      throw new DomainError(
        'Para completar un operativo usa el cierre: exige resultado final y observaciones.',
        'CIERRE_REQUIERE_RESULTADO',
      );
    }
    this.aplicarTransicion(nuevoEstado);
  }

  cerrar(resultado: ResultadoOperativo, observaciones: string | null): void {
    this.aplicarTransicion(EstadoOperativo.CERRADO);
    this.resultadoFinal = resultado;
    this.observacionesCierre = observaciones;
  }

  cambiarPrioridad(prioridad: PrioridadOperativo): void {
    this.asegurarEditable();
    this.prioridad = prioridad;
  }

  asegurarEditable(): void {
    if (esEstadoFinal(this.estado)) {
      throw new DomainError(
        `El operativo ${this.codigo} esta ${this.estado} y ya no admite cambios.`,
        'OPERATIVO_FINALIZADO',
      );
    }
  }

  /** Bases que deben enterarse de cualquier cambio: la lider y las participantes. */
  basesInvolucradas(): string[] {
    const ids = new Set<string>([this.baseLiderId]);
    for (const participacion of this.bases ?? []) ids.add(participacion.baseNavalId);
    return [...ids];
  }

  participaBase(baseNavalId: string): boolean {
    return this.basesInvolucradas().includes(baseNavalId);
  }

  baseLiderParticipa(): boolean {
    return (this.bases ?? []).some(
      (p) => p.baseNavalId === this.baseLiderId && p.rolParticipacion === RolParticipacion.LIDER,
    );
  }

  private aplicarTransicion(nuevoEstado: EstadoOperativo): void {
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
    if (esEstadoFinal(nuevoEstado)) {
      this.fechaCierre = new Date();
    }
  }
}
