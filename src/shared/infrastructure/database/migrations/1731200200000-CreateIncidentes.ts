import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RF-6 Historial de incidentes y enfrentamientos.
 *
 * Tampoco existe en database/schema.sql. Ojo: `criminales_historial` es un log
 * de cambios de atributos alimentado por trigger, no un historial de
 * enfrentamientos; son dos cosas distintas. Dueño: Dev 6.
 */
export class CreateIncidentes1731200200000 implements MigrationInterface {
  name = 'CreateIncidentes1731200200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE incidentes (
        id VARCHAR(36) PRIMARY KEY,
        operativo_id VARCHAR(36) NULL,
        tipo ENUM('ENFRENTAMIENTO','CAPTURA','FUGA','AVISTAMIENTO_HOSTIL','SABOTAJE') NOT NULL,
        resultado ENUM('EN_CURSO','EXITO','FRACASO','PARCIAL') NOT NULL DEFAULT 'EN_CURSO',
        fecha_hora TIMESTAMP NOT NULL,
        ubicacion TEXT NOT NULL,
        zona_influencia_id VARCHAR(36) NULL,
        base_naval_id VARCHAR(36) NULL,
        descripcion TEXT NOT NULL,
        bajas_marina INT NOT NULL DEFAULT 0 CHECK (bajas_marina >= 0),
        bajas_enemigas INT NOT NULL DEFAULT 0 CHECK (bajas_enemigas >= 0),
        registrado_por VARCHAR(36) NULL,
        version BIGINT NOT NULL DEFAULT 1 CHECK (version >= 0),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_incidentes_operativo FOREIGN KEY (operativo_id)
          REFERENCES operativos(id) ON DELETE SET NULL,
        CONSTRAINT fk_incidentes_zona FOREIGN KEY (zona_influencia_id)
          REFERENCES zonas_influencia(id) ON DELETE SET NULL,
        CONSTRAINT fk_incidentes_base FOREIGN KEY (base_naval_id)
          REFERENCES bases_navales(id) ON DELETE SET NULL,
        CONSTRAINT fk_incidentes_registrado FOREIGN KEY (registrado_por)
          REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`CREATE INDEX ix_incidentes_fecha ON incidentes(fecha_hora DESC)`);
    await queryRunner.query(
      `CREATE INDEX ix_incidentes_tipo_resultado ON incidentes(tipo, resultado)`,
    );

    await queryRunner.query(`
      CREATE TABLE incidente_participantes (
        id VARCHAR(36) PRIMARY KEY,
        incidente_id VARCHAR(36) NOT NULL,
        criminal_id VARCHAR(36) NOT NULL,
        rol_en_incidente ENUM('OBJETIVO','COMPLICE','TESTIGO') NOT NULL DEFAULT 'OBJETIVO',
        desenlace ENUM('CAPTURADO','ESCAPO','MUERTO','DESCONOCIDO') NOT NULL DEFAULT 'DESCONOCIDO',
        observaciones TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_incidente_criminal UNIQUE (incidente_id, criminal_id),
        CONSTRAINT fk_participantes_incidente FOREIGN KEY (incidente_id)
          REFERENCES incidentes(id) ON DELETE CASCADE,
        CONSTRAINT fk_participantes_criminal FOREIGN KEY (criminal_id)
          REFERENCES criminales(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS incidente_participantes`);
    await queryRunner.query(`DROP TABLE IF EXISTS incidentes`);
  }
}
