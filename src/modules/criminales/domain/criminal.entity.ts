import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';
import { Antecedente } from './antecedente.entity';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import type { MotivoCambioCriminal } from '../../../shared/domain/events/eventos.contracts';
import {
  EstadoCriminal,
  NivelAmenaza,
  puedeTransicionar,
  RolMembresia,
} from './estado-criminal.enum';
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
  foto!: FotoCriminal | null;

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

  /**
   * Aplica cambios de datos personales y devuelve POR QUE cambio el criminal.
   * Esos motivos viajan en el evento CRIMINAL_ACTUALIZADO: Carteles decide con
   * ellos si emite una version nueva y Amenaza si reclasifica.
   */
  actualizarDatos(cambios: CambiosDatosCriminal, usuarioId: string): MotivoCambioCriminal[] {
    if (this.estado === EstadoCriminal.MUERTO) {
      throw new DomainError(
        'No se pueden modificar los datos de un criminal dado de baja como MUERTO.',
        'CRIMINAL_CERRADO',
      );
    }

    const motivos = new Set<MotivoCambioCriminal>();
    const asignar = <K extends keyof CambiosDatosCriminal>(campo: K, valor: Criminal[K]): void => {
      const entidad = this as Criminal;
      if (JSON.stringify(entidad[campo]) !== JSON.stringify(valor)) {
        entidad[campo] = valor;
        motivos.add(campo === 'zonaInfluenciaId' ? 'ZONA' : 'DATOS');
      }
    };

    if (cambios.nombre !== undefined) asignar('nombre', cambios.nombre.trim());
    if (cambios.alias !== undefined) asignar('alias', cambios.alias);
    if (cambios.edad !== undefined) asignar('edad', cambios.edad);
    if (cambios.descripcionFisica !== undefined) {
      asignar('descripcionFisica', cambios.descripcionFisica);
    }
    if (cambios.zonaInfluenciaId !== undefined) {
      asignar('zonaInfluenciaId', cambios.zonaInfluenciaId);
    }

    if (motivos.size > 0) {
      this.actualizadoPor = usuarioId;
    }
    return [...motivos];
  }

  cambiarFoto(foto: FotoCriminal, usuarioId: string): void {
    this.foto = foto;
    this.actualizadoPor = usuarioId;
  }

  /** Recompensa vigente aprobada por el modulo de Recompensas (RF-1). */
  aplicarRecompensaVigente(monto: number, usuarioId: string | null): void {
    this.recompensaVigenteMonto = monto;
    this.actualizadoPor = usuarioId;
  }

  /**
   * Afiliacion principal: la membresia vigente de mayor rango (LIDER > OFICIAL >
   * MIEMBRO). Requiere `membresias` cargadas con su organizacion.
   */
  membresiaPrincipal(): Membresia | null {
    const vigentes = (this.membresias ?? []).filter((m) => m.vigente);
    if (vigentes.length === 0) return null;
    return [...vigentes].sort((a, b) => RANGO_MEMBRESIA[b.rol] - RANGO_MEMBRESIA[a.rol])[0];
  }
}

const RANGO_MEMBRESIA: Readonly<Record<RolMembresia, number>> = {
  [RolMembresia.LIDER]: 3,
  [RolMembresia.OFICIAL]: 2,
  [RolMembresia.MIEMBRO]: 1,
};

export interface FotoCriminal {
  url: string;
  mime: string;
  tamano_bytes: number;
}

/** Campos de datos personales editables. `null` borra el valor; `undefined` no lo toca. */
export interface CambiosDatosCriminal {
  readonly nombre?: string;
  readonly alias?: string[];
  readonly edad?: number | null;
  readonly descripcionFisica?: string | null;
  readonly zonaInfluenciaId?: string | null;
}
