import { CreateDateColumn, PrimaryColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

/**
 * Base de las entidades del esquema: id VARCHAR(36), version para concurrencia
 * optimista y timestamps. Coincide con las columnas que ya define schema.sql.
 */
export abstract class BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @VersionColumn({ type: 'bigint', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
