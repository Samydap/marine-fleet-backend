import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';
import { Antecedente } from './antecedente.entity';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { EstadoCriminal, NivelAmenaza, puedeTransicionar } from './estado-criminal.enum';
import { Membresia } from './membresia.entity';

/**
 * RF-1. Mapea la tabla `criminales` de database/schema.sql.
 *
 * Nota: los nombres de columna van explicitos porque el esquema usa snake_case
 * y el codigo camelCase. No se usa una naming strategy global para que leer la
 * entidad baste para saber a que columna corresponde cada propiedad.
 */
@Entity('criminales')
@Index('ix_criminales_estado_nivel', ['estado', 'nivelAmenaza'])
export class Criminal extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ name: 'nombre_normalizado', type: 'varchar', length: 150, unique: true })
  nombreNormalizado!: string;

  @Column({ type: 'json', nullable: true })
  alias!: string[] | null;

  @Column({ type: 'int', nullable: true })
  edad!: number | null;

  @Column({ name: 'descripcion_fisica', type: 'text', nullable: true })
  descripcionFisica!: string | null;

  @Column({ type: 'json', nullable: true })
  foto!: { url: string; mime: string; tamano_bytes: number } | null;

  @Column({ type: 'enum', enum: EstadoCriminal, default: EstadoCriminal.ACTIVO })
  estado!: EstadoCriminal;

  @Column({ name: 'fecha_baja', type: 'timestamp', nullable: true })
  fechaBaja!: Date | null;

  @Column({ name: 'zona_influencia_id', type: 'varchar', length: 36, nullable: true })
  zonaInfluenciaId!: string | null;

  @Column({
    name: 'recompensa_vigente_monto',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value === null ? null : Number(value)),
    },
  })
  recompensaVigenteMonto!: number | null;

  @Column({
    name: 'nivel_amenaza',
    type: 'enum',
    enum: NivelAmenaza,
    default: NivelAmenaza.PENDIENTE,
  })
  nivelAmenaza!: NivelAmenaza;

  @Column({ name: 'origen_base_id', type: 'varchar', length: 36, nullable: true })
  origenBaseId!: string | null;

  @Column({ name: 'creado_por', type: 'varchar', length: 36, nullable: true })
  creadoPor!: string | null;

  @Column({ name: 'actualizado_por', type: 'varchar', length: 36, nullable: true })
  actualizadoPor!: string | null;

  @OneToMany(() => Membresia, (membresia) => membresia.criminal)
  membresias?: Membresia[];

  @OneToMany(() => Antecedente, (antecedente) => antecedente.criminal)
  antecedentes?: Antecedente[];

  // --- Comportamiento de dominio (no lo decide el controller) ---

  /** Aplica la transicion de estado validando las reglas del dominio. */
  cambiarEstado(nuevoEstado: EstadoCriminal, usuarioId: string): void {
    if (this.estado === nuevoEstado) {
      return;
    }
    if (!puedeTransicionar(this.estado, nuevoEstado)) {
      throw new DomainError(
        `Transicion de estado no permitida: ${this.estado} -> ${nuevoEstado}.`,
        'TRANSICION_INVALIDA',
      );
    }

    this.estado = nuevoEstado;
    this.actualizadoPor = usuarioId;
    this.fechaBaja = nuevoEstado === EstadoCriminal.ACTIVO ? null : (this.fechaBaja ?? new Date());
  }

  estaEnBusqueda(): boolean {
    return this.estado === EstadoCriminal.ACTIVO;
  }
}
