import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ajustes tras la revision de codigo:
 *
 *  1. `carteles.motivo_generacion` admite CAMBIO_DATOS: el nombre y los alias se
 *     imprimen en el cartel, asi que corregirlos debe emitir una version nueva.
 *  2. El historial de modificaciones de un criminal ahora incluye sus
 *     AFILIACIONES y ANTECEDENTES (antes solo cambios de columnas de `criminales`
 *     y de estado de recompensas). Igual que el resto, por trigger en la base.
 */
export class AjustesRevision1731200700000 implements MigrationInterface {
  name = 'AjustesRevision1731200700000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE carteles MODIFY motivo_generacion
        ENUM('REGISTRO','CAMBIO_FOTO','CAMBIO_RECOMPENSA','CAMBIO_ESTADO','CAMBIO_AFILIACION',
             'CAMBIO_DATOS','MANUAL') NOT NULL`);

    await qr.query(`DROP TRIGGER IF EXISTS trg_membresias_historial_insert`);
    await qr.query(`
      CREATE TRIGGER trg_membresias_historial_insert
      AFTER INSERT ON membresias FOR EACH ROW
        INSERT INTO criminales_historial (criminal_id, campo, valor_anterior, valor_nuevo, usuario_id)
        VALUES (NEW.criminal_id, 'afiliacion', NULL,
                CONCAT((SELECT nombre FROM organizaciones WHERE id = NEW.organizacion_id), ' (', NEW.rol, ')'),
                NEW.creado_por)`);

    await qr.query(`DROP TRIGGER IF EXISTS trg_membresias_historial_update`);
    await qr.query(`
      CREATE TRIGGER trg_membresias_historial_update
      AFTER UPDATE ON membresias FOR EACH ROW
      BEGIN
        IF OLD.vigente = 1 AND NEW.vigente = 0 THEN
          INSERT INTO criminales_historial (criminal_id, campo, valor_anterior, valor_nuevo, usuario_id)
          VALUES (NEW.criminal_id, 'afiliacion',
                  CONCAT((SELECT nombre FROM organizaciones WHERE id = NEW.organizacion_id), ' (', OLD.rol, ')'),
                  'DESAFILIADO', NEW.creado_por);
        ELSEIF NOT (OLD.rol <=> NEW.rol) THEN
          INSERT INTO criminales_historial (criminal_id, campo, valor_anterior, valor_nuevo, usuario_id)
          VALUES (NEW.criminal_id, 'afiliacion.rol', OLD.rol, NEW.rol, NEW.creado_por);
        END IF;
      END`);

    await qr.query(`DROP TRIGGER IF EXISTS trg_antecedentes_historial_insert`);
    await qr.query(`
      CREATE TRIGGER trg_antecedentes_historial_insert
      AFTER INSERT ON antecedentes FOR EACH ROW
        INSERT INTO criminales_historial (criminal_id, campo, valor_anterior, valor_nuevo, usuario_id)
        VALUES (NEW.criminal_id, 'antecedente', NULL, NEW.tipo_delito, NEW.registrado_por)`);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TRIGGER IF EXISTS trg_antecedentes_historial_insert`);
    await qr.query(`DROP TRIGGER IF EXISTS trg_membresias_historial_update`);
    await qr.query(`DROP TRIGGER IF EXISTS trg_membresias_historial_insert`);
    await qr.query(
      `UPDATE carteles SET motivo_generacion = 'MANUAL' WHERE motivo_generacion = 'CAMBIO_DATOS'`,
    );
    await qr.query(`
      ALTER TABLE carteles MODIFY motivo_generacion
        ENUM('REGISTRO','CAMBIO_FOTO','CAMBIO_RECOMPENSA','CAMBIO_ESTADO','CAMBIO_AFILIACION',
             'MANUAL') NOT NULL`);
  }
}
