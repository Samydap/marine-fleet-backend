import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RF-4 Coordinacion de operativos entre bases navales.
 *
 * Estas tablas NO existen en database/schema.sql: es el hueco detectado en el
 * analisis de arquitectura. Debe correr antes de que el modulo `operativos`
 * pueda implementarse. Dueño: Dev 6.
 */
export class CreateOperativos1731200100000 implements MigrationInterface {
  name = 'CreateOperativos1731200100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE operativos (
        id VARCHAR(36) PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(150) NOT NULL,
        objetivo_criminal_id VARCHAR(36) NULL,
        zona_influencia_id VARCHAR(36) NOT NULL,
        base_lider_id VARCHAR(36) NOT NULL,
        estado ENUM('PLANIFICADO','EN_CURSO','CERRADO','ABORTADO') NOT NULL DEFAULT 'PLANIFICADO',
        prioridad ENUM('BAJA','MEDIA','ALTA','CRITICA') NOT NULL DEFAULT 'MEDIA',
        descripcion TEXT,
        fecha_inicio_planeada TIMESTAMP NULL,
        fecha_inicio_real TIMESTAMP NULL,
        fecha_cierre TIMESTAMP NULL,
        creado_por VARCHAR(36) NULL,
        version BIGINT NOT NULL DEFAULT 1 CHECK (version >= 0),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_operativos_criminal FOREIGN KEY (objetivo_criminal_id)
          REFERENCES criminales(id) ON DELETE SET NULL,
        CONSTRAINT fk_operativos_zona FOREIGN KEY (zona_influencia_id)
          REFERENCES zonas_influencia(id) ON DELETE RESTRICT,
        CONSTRAINT fk_operativos_base_lider FOREIGN KEY (base_lider_id)
          REFERENCES bases_navales(id) ON DELETE RESTRICT,
        CONSTRAINT fk_operativos_creado FOREIGN KEY (creado_por)
          REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(
      `CREATE INDEX ix_operativos_estado_prioridad ON operativos(estado, prioridad)`,
    );
    await queryRunner.query(
      `CREATE INDEX ix_operativos_zona_estado ON operativos(zona_influencia_id, estado)`,
    );

    await queryRunner.query(`
      CREATE TABLE operativo_bases (
        id VARCHAR(36) PRIMARY KEY,
        operativo_id VARCHAR(36) NOT NULL,
        base_naval_id VARCHAR(36) NOT NULL,
        rol_participacion ENUM('LIDER','APOYO','LOGISTICA','BLOQUEO') NOT NULL DEFAULT 'APOYO',
        unidades_asignadas INT NOT NULL DEFAULT 0 CHECK (unidades_asignadas >= 0),
        confirmada TINYINT(1) NOT NULL DEFAULT 0,
        observaciones TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_operativo_base UNIQUE (operativo_id, base_naval_id),
        CONSTRAINT fk_opbases_operativo FOREIGN KEY (operativo_id)
          REFERENCES operativos(id) ON DELETE CASCADE,
        CONSTRAINT fk_opbases_base FOREIGN KEY (base_naval_id)
          REFERENCES bases_navales(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS operativo_bases`);
    await queryRunner.query(`DROP TABLE IF EXISTS operativos`);
  }
}
