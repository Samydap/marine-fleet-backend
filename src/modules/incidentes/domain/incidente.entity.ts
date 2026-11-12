import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { Participante } from './participante.entity';
import {
  DesenlaceParticipante,
  ResultadoEnfrentamiento,
  TipoIncidente,
} from './resultado-enfrentamiento.enum';

/** Marino que participo en el enfrentamiento (columna JSON `participantes_marina`). */
export interface MarinoParticipante {
  nombre: string;
  rango?: string;
  usuarioId?: string;
}

/**
 * RF-6. Tabla `incidentes` (migraciones CreateIncidentes + AmpliarModelo).
 * Es la clase `Enfrentamiento` del diagrama de clases.
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

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ name: 'participantes_marina', type: 'json', nullable: true })
  participantesMarina!: MarinoParticipante[] | null;

  @Column({ name: 'registrado_por', type: 'varchar', length: 36, nullable: true })
  registradoPor!: string | null;

  @OneToMany(() => Participante, (participante) => participante.incidente)
  participantes?: Participante[];

  // --- Comportamiento de dominio ---

  estaCerrado(): boolean {
    return this.resultado !== ResultadoEnfrentamiento.EN_CURSO;
  }

  /**
   * Cierra el enfrentamiento: fija el resultado y el desenlace de cada criminal.
   * Un desenlace solo puede referirse a un criminal que participo.
   */
  cerrar(
    resultado: ResultadoEnfrentamiento,
    desenlaces: ReadonlyArray<{ criminalId: string; desenlace: DesenlaceParticipante }>,
  ): void {
    if (this.estaCerrado()) {
      throw new DomainError('El enfrentamiento ya esta cerrado.', 'INCIDENTE_CERRADO');
    }
    if (resultado === ResultadoEnfrentamiento.EN_CURSO) {
      throw new DomainError('El resultado final no puede ser EN_CURSO.', 'RESULTADO_INVALIDO');
    }

    const participantes = this.participantes ?? [];
    for (const { criminalId, desenlace } of desenlaces) {
      const participante = participantes.find((p) => p.criminalId === criminalId);
      if (!participante) {
        throw new DomainError(
          `El criminal ${criminalId} no participo en este enfrentamiento.`,
          'PARTICIPANTE_INEXISTENTE',
        );
      }
      participante.desenlace = desenlace;
    }
    this.resultado = resultado;
  }
}
