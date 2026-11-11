import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';

/**
 * RF-5. Tabla `criterios_amenaza`: los umbrales de bounty son CONFIGURABLES y
 * versionados (`vigente`, `vigente_desde`, `vigente_hasta`), no constantes en
 * el codigo. Un Almirante puede ajustarlos sin desplegar.
 */
@Entity('criterios_amenaza')
export class CriterioAmenaza {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'enum', enum: NivelAmenaza })
  nivel!: NivelAmenaza;

  @Column({
    name: 'monto_minimo',
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  montoMinimo!: number;

  @Column({
    name: 'monto_maximo',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v === null ? null : Number(v)),
    },
  })
  montoMaximo!: number | null;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  vigente!: boolean;

  @CreateDateColumn({ name: 'vigente_desde', type: 'timestamp' })
  vigenteDesde!: Date;

  @Column({ name: 'vigente_hasta', type: 'timestamp', nullable: true })
  vigenteHasta!: Date | null;

  @Column({ name: 'modificado_por', type: 'varchar', length: 36, nullable: true })
  modificadoPor!: string | null;

  @Column({ type: 'text', nullable: true })
  motivo!: string | null;
}
