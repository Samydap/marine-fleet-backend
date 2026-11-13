import { Column, Entity, PrimaryColumn } from 'typeorm';
import { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';

/**
 * RF-5. Clase `AnalisisRiesgo` del diagrama de clases, tabla `analisis_riesgo`.
 *
 * Cada vez que el motor clasifica a un criminal queda una fila: con que monto,
 * que nivel daba el bounty solo, si se escalo por la zona y por que. Es lo que
 * permite responder "por que este criminal es ALTO" meses despues.
 */
@Entity('analisis_riesgo')
export class AnalisisRiesgo {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'criminal_id', type: 'varchar', length: 36 })
  criminalId!: string;

  @Column({ name: 'fecha_analisis', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaAnalisis!: Date;

  @Column({
    name: 'monto_evaluado',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v === null ? null : Number(v)),
    },
  })
  montoEvaluado!: number | null;

  @Column({ name: 'nivel_base', type: 'enum', enum: NivelAmenaza })
  nivelBase!: NivelAmenaza;

  @Column({ name: 'nivel_resultante', type: 'enum', enum: NivelAmenaza })
  nivelResultante!: NivelAmenaza;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  escalado!: boolean;

  @Column({ type: 'text' })
  justificacion!: string;

  @Column({ name: 'ejecutado_por', type: 'varchar', length: 36, nullable: true })
  ejecutadoPor!: string | null;
}
