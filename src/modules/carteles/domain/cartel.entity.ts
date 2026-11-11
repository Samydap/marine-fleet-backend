import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** Por que se (re)genero el cartel. Columna `carteles.motivo_generacion`. */
export enum MotivoGeneracion {
  REGISTRO = 'REGISTRO',
  CAMBIO_FOTO = 'CAMBIO_FOTO',
  CAMBIO_RECOMPENSA = 'CAMBIO_RECOMPENSA',
  CAMBIO_ESTADO = 'CAMBIO_ESTADO',
  CAMBIO_AFILIACION = 'CAMBIO_AFILIACION',
  MANUAL = 'MANUAL',
}

/**
 * RF-2. Tabla `carteles`.
 *
 * `datos_instantanea` guarda una FOTO del criminal en el momento de generar el
 * cartel: un cartel impreso no cambia porque la recompensa suba despues. Esa
 * columna es la razon de que el cartel sea versionado y no una vista.
 */
@Entity('carteles')
export class Cartel {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'criminal_id', type: 'varchar', length: 36 })
  criminalId!: string;

  @Column({ name: 'numero_version', type: 'int' })
  numeroVersion!: number;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  vigente!: boolean;

  @Column({ type: 'json' })
  archivo!: { url: string; mime: string; tamano_bytes: number };

  @Column({ name: 'datos_instantanea', type: 'json' })
  datosInstantanea!: Record<string, unknown>;

  @Column({ name: 'motivo_generacion', type: 'enum', enum: MotivoGeneracion })
  motivoGeneracion!: MotivoGeneracion;

  @Column({ name: 'generado_por', type: 'varchar', length: 36, nullable: true })
  generadoPor!: string | null;

  @CreateDateColumn({ name: 'generado_en', type: 'timestamp' })
  generadoEn!: Date;
}
