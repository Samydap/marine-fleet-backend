import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ESQUEMA BASE DEL SISTEMA (equivalente a database/schema.sql de la v1).
 *
 * Por que existe: el schema.sql vivia en el repositorio viejo (Caso_13_IngSoft),
 * asi que este repo no podia levantar la base por si solo. Con esta migracion,
 * `npm run migration:run` sobre una base VACIA crea todo el modelo.
 *
 * Usa CREATE TABLE IF NOT EXISTS: si alguien ya corrio el schema.sql original,
 * las tablas existentes se respetan y no se pierde nada. Las columnas que la v1
 * no tenia se agregan en 1731200300000-AmpliarModelo, que revisa antes de alterar.
 *
 * Orden: primero catalogos, luego seguridad, luego el dominio criminal.
 */
const TABLA = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
const AUDITABLE = `
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`;

export class InitSchema1731200000000 implements MigrationInterface {
  name = 'InitSchema1731200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------------------------------------------------------------- catalogos
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mares (
        id VARCHAR(36) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        tipo ENUM('CUATRO_MARES','GRAND_LINE') NOT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1
      ) ${TABLA}`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS zonas_influencia (
        id VARCHAR(36) PRIMARY KEY,
        mar_id VARCHAR(36) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        CONSTRAINT uq_zona_mar_nombre UNIQUE (mar_id, nombre),
        CONSTRAINT fk_zonas_mar FOREIGN KEY (mar_id) REFERENCES mares(id) ON DELETE RESTRICT
      ) ${TABLA}`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bases_navales (
        id VARCHAR(36) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        zona_influencia_id VARCHAR(36) NOT NULL,
        ubicacion TEXT NOT NULL,
        comandante_nombre VARCHAR(150) NOT NULL,
        estado ENUM('ACTIVA','INACTIVA') NOT NULL DEFAULT 'ACTIVA',
        ${AUDITABLE},
        CONSTRAINT fk_bases_zona FOREIGN KEY (zona_influencia_id)
          REFERENCES zonas_influencia(id) ON DELETE RESTRICT
      ) ${TABLA}`);

    // --------------------------------------------------------------- seguridad
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(36) PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT NULL,
        permisos JSON NOT NULL,
        requiere_2fa TINYINT(1) NOT NULL DEFAULT 0,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ${TABLA}`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id VARCHAR(36) PRIMARY KEY,
        nombre_completo VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        rol_id VARCHAR(36) NOT NULL,
        base_naval_id VARCHAR(36) NULL,
        estado ENUM('ACTIVO','BLOQUEADO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
        mfa_habilitado TINYINT(1) NOT NULL DEFAULT 0,
        mfa_secreto_cifrado TEXT NULL,
        intentos_fallidos INT NOT NULL DEFAULT 0,
        ultimo_acceso TIMESTAMP NULL,
        ${AUDITABLE},
        CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE RESTRICT,
        CONSTRAINT fk_usuarios_base FOREIGN KEY (base_naval_id)
          REFERENCES bases_navales(id) ON DELETE SET NULL
      ) ${TABLA}`);

    // ------------------------------------------------------- dominio criminal
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organizaciones (
        id VARCHAR(36) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        tipo_agrupacion ENUM('TRIPULACION','ORGANIZACION','BANDA') NOT NULL,
        categoria ENUM('PIRATA','REVOLUCIONARIO','CRIMINAL_INDEPENDIENTE') NOT NULL,
        zona_influencia_id VARCHAR(36) NULL,
        descripcion TEXT NULL,
        activa TINYINT(1) NOT NULL DEFAULT 1,
        ${AUDITABLE},
        CONSTRAINT fk_org_zona FOREIGN KEY (zona_influencia_id)
          REFERENCES zonas_influencia(id) ON DELETE SET NULL
      ) ${TABLA}`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS criminales (
        id VARCHAR(36) PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        nombre_normalizado VARCHAR(150) NOT NULL UNIQUE,
        alias JSON NULL,
        edad INT NULL CHECK (edad IS NULL OR edad BETWEEN 0 AND 500),
        descripcion_fisica TEXT NULL,
        foto JSON NULL,
        estado ENUM('ACTIVO','CAPTURADO','MUERTO') NOT NULL DEFAULT 'ACTIVO',
        fecha_baja TIMESTAMP NULL,
        zona_influencia_id VARCHAR(36) NULL,
        recompensa_vigente_monto DECIMAL(15,2) NULL CHECK (
          recompensa_vigente_monto IS NULL OR recompensa_vigente_monto >= 0),
        nivel_amenaza ENUM('BAJO','MEDIO','ALTO','PENDIENTE') NOT NULL DEFAULT 'PENDIENTE',
        origen_base_id VARCHAR(36) NULL,
        creado_por VARCHAR(36) NULL,
        actualizado_por VARCHAR(36) NULL,
        ${AUDITABLE},
        CONSTRAINT fk_criminales_zona FOREIGN KEY (zona_influencia_id)
          REFERENCES zonas_influencia(id) ON DELETE SET NULL,
        CONSTRAINT fk_criminales_base FOREIGN KEY (origen_base_id)
          REFERENCES bases_navales(id) ON DELETE SET NULL,
        CONSTRAINT fk_criminales_creado FOREIGN KEY (creado_por)
          REFERENCES usuarios(id) ON DELETE SET NULL,
        CONSTRAINT fk_criminales_actualizado FOREIGN KEY (actualizado_por)
          REFERENCES usuarios(id) ON DELETE SET NULL
      ) ${TABLA}`);
    await this.indice(
      queryRunner,
      'criminales',
      'ix_criminales_estado_nivel',
      'estado, nivel_amenaza',
    );
    await this.indice(queryRunner, 'criminales', 'ix_criminales_zona', 'zona_influencia_id');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS membresias (
        id VARCHAR(36) PRIMARY KEY,
        criminal_id VARCHAR(36) NOT NULL,
        organizacion_id VARCHAR(36) NOT NULL,
        rol ENUM('LIDER','OFICIAL','MIEMBRO') NOT NULL DEFAULT 'MIEMBRO',
        vigente TINYINT(1) NOT NULL DEFAULT 1,
        fecha_ingreso TIMESTAMP NULL,
        fecha_salida TIMESTAMP NULL,
        creado_por VARCHAR(36) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_membresias_criminal FOREIGN KEY (criminal_id)
          REFERENCES criminales(id) ON DELETE CASCADE,
        CONSTRAINT fk_membresias_org FOREIGN KEY (organizacion_id)
          REFERENCES organizaciones(id) ON DELETE CASCADE
      ) ${TABLA}`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS antecedentes (
        id VARCHAR(36) PRIMARY KEY,
        criminal_id VARCHAR(36) NOT NULL,
        tipo_delito VARCHAR(100) NOT NULL,
        descripcion TEXT NOT NULL,
        fecha_hecho TIMESTAMP NULL,
        ubicacion TEXT NULL,
        registrado_por VARCHAR(36) NULL,
        ${AUDITABLE},
        CONSTRAINT fk_antecedentes_criminal FOREIGN KEY (criminal_id)
          REFERENCES criminales(id) ON DELETE CASCADE
      ) ${TABLA}`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS recompensas (
        id VARCHAR(36) PRIMARY KEY,
        criminal_id VARCHAR(36) NOT NULL,
        monto DECIMAL(15,2) NOT NULL CHECK (monto >= 0),
        moneda VARCHAR(20) NOT NULL DEFAULT 'BERRIES',
        estado ENUM('PENDIENTE_VALIDACION','VIGENTE','HISTORICA','RECHAZADA')
          NOT NULL DEFAULT 'PENDIENTE_VALIDACION',
        requiere_validacion TINYINT(1) NOT NULL DEFAULT 0,
        solicitada_por VARCHAR(36) NULL,
        fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        validada_por VARCHAR(36) NULL,
        fecha_validacion TIMESTAMP NULL,
        vigente_desde TIMESTAMP NULL,
        vigente_hasta TIMESTAMP NULL,
        motivo TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_recompensas_criminal FOREIGN KEY (criminal_id)
          REFERENCES criminales(id) ON DELETE CASCADE
      ) ${TABLA}`);
    await this.indice(
      queryRunner,
      'recompensas',
      'ix_recompensas_criminal_estado',
      'criminal_id, estado',
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS criterios_amenaza (
        id VARCHAR(36) PRIMARY KEY,
        nivel ENUM('BAJO','MEDIO','ALTO','PENDIENTE') NOT NULL,
        monto_minimo DECIMAL(15,2) NOT NULL,
        monto_maximo DECIMAL(15,2) NULL,
        vigente TINYINT(1) NOT NULL DEFAULT 1,
        vigente_desde TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        vigente_hasta TIMESTAMP NULL,
        modificado_por VARCHAR(36) NULL,
        motivo TEXT NULL
      ) ${TABLA}`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS carteles (
        id VARCHAR(36) PRIMARY KEY,
        criminal_id VARCHAR(36) NOT NULL,
        numero_version INT NOT NULL,
        vigente TINYINT(1) NOT NULL DEFAULT 1,
        archivo JSON NOT NULL,
        datos_instantanea JSON NOT NULL,
        motivo_generacion ENUM('REGISTRO','CAMBIO_FOTO','CAMBIO_RECOMPENSA','CAMBIO_ESTADO',
          'CAMBIO_AFILIACION','MANUAL') NOT NULL,
        generado_por VARCHAR(36) NULL,
        generado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_cartel_version UNIQUE (criminal_id, numero_version),
        CONSTRAINT fk_carteles_criminal FOREIGN KEY (criminal_id)
          REFERENCES criminales(id) ON DELETE CASCADE
      ) ${TABLA}`);

    // ------------------------------------------------------------ inteligencia
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS avistamientos (
        id VARCHAR(36) PRIMARY KEY,
        criminal_id VARCHAR(36) NOT NULL,
        fecha_hora TIMESTAMP NOT NULL,
        ubicacion TEXT NOT NULL,
        CONSTRAINT fk_avistamientos_criminal FOREIGN KEY (criminal_id)
          REFERENCES criminales(id) ON DELETE CASCADE
      ) ${TABLA}`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reportes_ciudadanos (
        id VARCHAR(36) PRIMARY KEY,
        criminal_id VARCHAR(36) NOT NULL,
        descripcion TEXT NOT NULL,
        fecha_hecho TIMESTAMP NULL,
        ubicacion TEXT NOT NULL,
        informante JSON NOT NULL,
        estado ENUM('PENDIENTE','APROBADO','RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
        revisado_por VARCHAR(36) NULL,
        fecha_revision TIMESTAMP NULL,
        motivo_rechazo TEXT NULL,
        avistamiento_id VARCHAR(36) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_reportes_criminal FOREIGN KEY (criminal_id)
          REFERENCES criminales(id) ON DELETE CASCADE
      ) ${TABLA}`);

    // ------------------------------------------- trazabilidad de criminales
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS criminales_historial (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        criminal_id VARCHAR(36) NOT NULL,
        campo VARCHAR(60) NOT NULL,
        valor_anterior TEXT NULL,
        valor_nuevo TEXT NULL,
        usuario_id VARCHAR(36) NULL,
        fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX ix_historial_criminal_fecha (criminal_id, fecha)
      ) ${TABLA}`);

    await this.crearTriggersCriminales(queryRunner);
  }

  /**
   * RNF de trazabilidad: el trigger vive EN LA BASE, de modo que incluso un
   * UPDATE hecho a mano en phpMyAdmin deja rastro. El usuario se toma de
   * `actualizado_por`, que la aplicacion llena en cada escritura.
   */
  private async crearTriggersCriminales(queryRunner: QueryRunner): Promise<void> {
    const campos = [
      'nombre',
      'alias',
      'edad',
      'descripcion_fisica',
      'foto',
      'estado',
      'zona_influencia_id',
      'recompensa_vigente_monto',
      'nivel_amenaza',
    ];

    const cuerpo = campos
      .map(
        (campo) => `
        IF NOT (OLD.${campo} <=> NEW.${campo}) THEN
          INSERT INTO criminales_historial (criminal_id, campo, valor_anterior, valor_nuevo, usuario_id)
          VALUES (NEW.id, '${campo}', CAST(OLD.${campo} AS CHAR), CAST(NEW.${campo} AS CHAR),
                  NEW.actualizado_por);
        END IF;`,
      )
      .join('');

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_criminales_historial_update`);
    await queryRunner.query(`
      CREATE TRIGGER trg_criminales_historial_update
      AFTER UPDATE ON criminales FOR EACH ROW
      BEGIN ${cuerpo}
      END`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_criminales_historial_insert`);
    await queryRunner.query(`
      CREATE TRIGGER trg_criminales_historial_insert
      AFTER INSERT ON criminales FOR EACH ROW
        INSERT INTO criminales_historial (criminal_id, campo, valor_anterior, valor_nuevo, usuario_id)
        VALUES (NEW.id, 'REGISTRO', NULL, NEW.nombre, NEW.creado_por)`);
  }

  private async indice(
    qr: QueryRunner,
    tabla: string,
    nombre: string,
    columnas: string,
  ): Promise<void> {
    const existe = (await qr.query(
      `SELECT COUNT(*) AS n FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
      [tabla, nombre],
    )) as Array<{ n: number | string }>;
    if (Number(existe[0]?.n ?? 0) === 0) {
      await qr.query(`CREATE INDEX ${nombre} ON ${tabla}(${columnas})`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_criminales_historial_insert`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_criminales_historial_update`);
    for (const tabla of [
      'criminales_historial',
      'reportes_ciudadanos',
      'avistamientos',
      'carteles',
      'criterios_amenaza',
      'recompensas',
      'antecedentes',
      'membresias',
      'criminales',
      'organizaciones',
      'usuarios',
      'roles',
      'bases_navales',
      'zonas_influencia',
      'mares',
    ]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${tabla}`);
    }
  }
}
