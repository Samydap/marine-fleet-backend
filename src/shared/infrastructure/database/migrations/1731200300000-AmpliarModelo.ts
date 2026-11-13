import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cierra los huecos entre el esquema y los requerimientos del documento IEEE.
 *
 * No edita las migraciones ya mergeadas (CreateOperativos, CreateIncidentes):
 * las corrige agregando columnas, que es la politica del README.
 *
 * Cada ALTER revisa information_schema antes de ejecutarse, asi la migracion
 * funciona igual en una base creada con InitSchema que en una creada con el
 * schema.sql de la v1, y en MySQL 8 o MariaDB (XAMPP).
 *
 * Que agrega y para que requerimiento:
 *  - avistamientos: testigo, zona, estado de verificacion, origen  (Centro de Inteligencia)
 *  - reportes_ciudadanos: zona                                      (filtros por zona)
 *  - operativos: objetivo, resultado final, observaciones de cierre (cerrar operativo)
 *  - operativo_bases: recursos navales asignados                    (asignar recursos)
 *  - operativo_responsables                                         (asignar responsables)
 *  - incidentes: observaciones y marinos participantes              (registrar enfrentamiento)
 *  - auditoria                                                      (bitacora consultable)
 *  - analisis_riesgo                                                (historial de clasificaciones)
 *  - notificaciones                                                 (aviso a bases asignadas)
 *  - reportes_recompensas                                           (reporte mensual por mar)
 *  - triggers de recompensas                                        (registros criticos inalterables)
 */
const TABLA = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

export class AmpliarModelo1731200300000 implements MigrationInterface {
  name = 'AmpliarModelo1731200300000';

  public async up(qr: QueryRunner): Promise<void> {
    // ------------------------------------------------------------ inteligencia
    await this.columna(qr, 'avistamientos', 'testigo', 'VARCHAR(150) NULL');
    await this.columna(qr, 'avistamientos', 'zona_influencia_id', 'VARCHAR(36) NULL');
    await this.columna(
      qr,
      'avistamientos',
      'estado_verificacion',
      "ENUM('PENDIENTE','VERIFICADO','DESCARTADO') NOT NULL DEFAULT 'PENDIENTE'",
    );
    await this.columna(
      qr,
      'avistamientos',
      'origen',
      "ENUM('OFICIAL','REPORTE_CIUDADANO') NOT NULL DEFAULT 'OFICIAL'",
    );
    await this.columna(qr, 'avistamientos', 'observaciones', 'TEXT NULL');
    await this.columna(qr, 'avistamientos', 'registrado_por', 'VARCHAR(36) NULL');
    await this.columna(qr, 'avistamientos', 'verificado_por', 'VARCHAR(36) NULL');
    await this.columna(
      qr,
      'avistamientos',
      'created_at',
      'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
    );
    await this.indice(
      qr,
      'avistamientos',
      'ix_avistamientos_criminal_fecha',
      'criminal_id, fecha_hora',
    );
    await this.indice(qr, 'avistamientos', 'ix_avistamientos_zona', 'zona_influencia_id');

    await this.columna(qr, 'reportes_ciudadanos', 'zona_influencia_id', 'VARCHAR(36) NULL');

    // -------------------------------------------------------------- operativos
    await this.columna(qr, 'operativos', 'objetivo', 'TEXT NULL');
    await this.columna(
      qr,
      'operativos',
      'resultado_final',
      "ENUM('EXITOSO','PARCIAL','FALLIDO') NULL",
    );
    await this.columna(qr, 'operativos', 'observaciones_cierre', 'TEXT NULL');
    await this.columna(qr, 'operativo_bases', 'recursos', 'TEXT NULL');

    await qr.query(`
      CREATE TABLE IF NOT EXISTS operativo_responsables (
        id VARCHAR(36) PRIMARY KEY,
        operativo_id VARCHAR(36) NOT NULL,
        usuario_id VARCHAR(36) NOT NULL,
        funcion VARCHAR(100) NOT NULL DEFAULT 'RESPONSABLE',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_operativo_responsable UNIQUE (operativo_id, usuario_id),
        CONSTRAINT fk_opresp_operativo FOREIGN KEY (operativo_id)
          REFERENCES operativos(id) ON DELETE CASCADE,
        CONSTRAINT fk_opresp_usuario FOREIGN KEY (usuario_id)
          REFERENCES usuarios(id) ON DELETE CASCADE
      ) ${TABLA}`);

    // -------------------------------------------------------------- incidentes
    await this.columna(qr, 'incidentes', 'observaciones', 'TEXT NULL');
    await this.columna(qr, 'incidentes', 'participantes_marina', 'JSON NULL');

    // --------------------------------------------------------------- auditoria
    await qr.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id VARCHAR(36) PRIMARY KEY,
        usuario_id VARCHAR(36) NULL,
        rol VARCHAR(50) NULL,
        accion VARCHAR(80) NOT NULL,
        tipo_accion ENUM('CREACION','ACTUALIZACION','ELIMINACION_LOGICA','CONSULTA','AUTENTICACION')
          NOT NULL DEFAULT 'ACTUALIZACION',
        entidad VARCHAR(60) NULL,
        entidad_id VARCHAR(36) NULL,
        valor_anterior JSON NULL,
        valor_nuevo JSON NULL,
        metodo VARCHAR(10) NULL,
        ruta VARCHAR(255) NULL,
        ip VARCHAR(64) NULL,
        exitoso TINYINT(1) NOT NULL DEFAULT 1,
        fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX ix_auditoria_fecha (fecha),
        INDEX ix_auditoria_usuario (usuario_id, fecha),
        INDEX ix_auditoria_entidad (entidad, entidad_id)
      ) ${TABLA}`);

    // ----------------------------------------------------------------- amenaza
    await qr.query(`
      CREATE TABLE IF NOT EXISTS analisis_riesgo (
        id VARCHAR(36) PRIMARY KEY,
        criminal_id VARCHAR(36) NOT NULL,
        fecha_analisis TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        monto_evaluado DECIMAL(15,2) NULL,
        nivel_base ENUM('BAJO','MEDIO','ALTO','PENDIENTE') NOT NULL,
        nivel_resultante ENUM('BAJO','MEDIO','ALTO','PENDIENTE') NOT NULL,
        escalado TINYINT(1) NOT NULL DEFAULT 0,
        justificacion TEXT NOT NULL,
        ejecutado_por VARCHAR(36) NULL,
        INDEX ix_analisis_criminal_fecha (criminal_id, fecha_analisis),
        CONSTRAINT fk_analisis_criminal FOREIGN KEY (criminal_id)
          REFERENCES criminales(id) ON DELETE CASCADE
      ) ${TABLA}`);

    // ------------------------------------------------------- sincronizacion
    await qr.query(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id VARCHAR(36) PRIMARY KEY,
        base_naval_id VARCHAR(36) NULL,
        usuario_id VARCHAR(36) NULL,
        tipo VARCHAR(60) NOT NULL,
        titulo VARCHAR(150) NOT NULL,
        mensaje TEXT NOT NULL,
        referencia_tipo VARCHAR(40) NULL,
        referencia_id VARCHAR(36) NULL,
        leida TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX ix_notificaciones_base (base_naval_id, leida, created_at),
        CONSTRAINT fk_notif_base FOREIGN KEY (base_naval_id)
          REFERENCES bases_navales(id) ON DELETE CASCADE
      ) ${TABLA}`);

    // ---------------------------------------------------------------- reportes
    await qr.query(`
      CREATE TABLE IF NOT EXISTS reportes_recompensas (
        id VARCHAR(36) PRIMARY KEY,
        periodo CHAR(7) NOT NULL,
        mar_id VARCHAR(36) NOT NULL,
        mar_nombre VARCHAR(100) NOT NULL,
        total_acumulado DECIMAL(18,2) NOT NULL DEFAULT 0,
        cantidad_criminales INT NOT NULL DEFAULT 0,
        generado_por VARCHAR(36) NULL,
        generado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_reporte_periodo_mar UNIQUE (periodo, mar_id)
      ) ${TABLA}`);

    await this.triggersRecompensas(qr);
  }

  /**
   * Registros criticos: una recompensa nunca cambia de monto ni se borra. Solo
   * cambia de estado (PENDIENTE -> VIGENTE -> HISTORICA), y cada cambio queda en
   * criminales_historial con el usuario que lo hizo.
   */
  private async triggersRecompensas(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TRIGGER IF EXISTS trg_recompensas_inmutables`);
    await qr.query(`
      CREATE TRIGGER trg_recompensas_inmutables
      BEFORE UPDATE ON recompensas FOR EACH ROW
      BEGIN
        IF NOT (OLD.monto <=> NEW.monto) OR NOT (OLD.criminal_id <=> NEW.criminal_id) THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Una recompensa es inmutable: emite una nueva en su lugar.';
        END IF;
      END`);

    await qr.query(`DROP TRIGGER IF EXISTS trg_recompensas_sin_borrado`);
    await qr.query(`
      CREATE TRIGGER trg_recompensas_sin_borrado
      BEFORE DELETE ON recompensas FOR EACH ROW
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Las recompensas no se eliminan.'`);

    await qr.query(`DROP TRIGGER IF EXISTS trg_recompensas_historial`);
    await qr.query(`
      CREATE TRIGGER trg_recompensas_historial
      AFTER UPDATE ON recompensas FOR EACH ROW
      BEGIN
        IF NOT (OLD.estado <=> NEW.estado) THEN
          INSERT INTO criminales_historial (criminal_id, campo, valor_anterior, valor_nuevo, usuario_id)
          VALUES (NEW.criminal_id, CONCAT('recompensa:', NEW.id), OLD.estado, NEW.estado,
                  COALESCE(NEW.validada_por, NEW.solicitada_por));
        END IF;
      END`);
  }

  private async columna(
    qr: QueryRunner,
    tabla: string,
    nombre: string,
    definicion: string,
  ): Promise<void> {
    const filas = (await qr.query(
      `SELECT COUNT(*) AS n FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [tabla, nombre],
    )) as Array<{ n: number | string }>;
    if (Number(filas[0]?.n ?? 0) === 0) {
      await qr.query(`ALTER TABLE ${tabla} ADD COLUMN ${nombre} ${definicion}`);
    }
  }

  private async indice(
    qr: QueryRunner,
    tabla: string,
    nombre: string,
    columnas: string,
  ): Promise<void> {
    const filas = (await qr.query(
      `SELECT COUNT(*) AS n FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
      [tabla, nombre],
    )) as Array<{ n: number | string }>;
    if (Number(filas[0]?.n ?? 0) === 0) {
      await qr.query(`CREATE INDEX ${nombre} ON ${tabla}(${columnas})`);
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    for (const trigger of [
      'trg_recompensas_historial',
      'trg_recompensas_sin_borrado',
      'trg_recompensas_inmutables',
    ]) {
      await qr.query(`DROP TRIGGER IF EXISTS ${trigger}`);
    }
    for (const tabla of [
      'reportes_recompensas',
      'notificaciones',
      'analisis_riesgo',
      'auditoria',
      'operativo_responsables',
    ]) {
      await qr.query(`DROP TABLE IF EXISTS ${tabla}`);
    }
    // Las columnas agregadas se conservan al revertir: borrarlas perderia datos.
  }
}
