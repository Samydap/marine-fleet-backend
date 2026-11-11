import { Column, Entity, PrimaryColumn } from 'typeorm';

export enum TipoMar {
  CUATRO_MARES = 'CUATRO_MARES',
  GRAND_LINE = 'GRAND_LINE',
}

/** Tabla `mares`. Catalogo de solo lectura. */
@Entity('mares')
export class Mar {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre!: string;

  @Column({ type: 'enum', enum: TipoMar })
  tipo!: TipoMar;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  activo!: boolean;
}
