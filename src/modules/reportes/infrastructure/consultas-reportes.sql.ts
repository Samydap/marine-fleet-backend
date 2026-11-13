/**
 * SQL del modelo de lectura de reportes. Cada reporte es UNA consulta agregada
 * (sin N+1) para cumplir el RNF de 3 segundos. Todos los valores del usuario
 * entran como parametros `?`, nunca interpolados.
 *
 * Usa ROW_NUMBER() (MySQL 8 / MariaDB 10.2+, incluido en XAMPP).
 */

/**
 * Recompensa vigente de cada criminal ACTIVO en la fecha de corte. Si por error
 * hubiera dos recompensas solapadas, se toma la mas reciente (rn = 1), asi nunca
 * se cuenta doble.
 * Parametros: corte, corte.
 */
export const SQL_RECOMPENSAS_POR_MAR = `
  SELECT m.id AS marId, m.nombre AS marNombre, m.tipo AS tipoMar,
         COALESCE(SUM(rv.monto), 0) AS totalAcumulado,
         COUNT(rv.criminal_id) AS cantidadCriminales
    FROM mares m
    LEFT JOIN zonas_influencia z ON z.mar_id = m.id
    LEFT JOIN criminales c ON c.zona_influencia_id = z.id AND c.estado = 'ACTIVO'
    LEFT JOIN (
      SELECT criminal_id, monto FROM (
        SELECT r.criminal_id, r.monto,
               ROW_NUMBER() OVER (PARTITION BY r.criminal_id
                                  ORDER BY r.vigente_desde DESC, r.created_at DESC) AS rn
          FROM recompensas r
         WHERE r.estado IN ('VIGENTE', 'HISTORICA')
           AND r.vigente_desde IS NOT NULL AND r.vigente_desde <= ?
           AND (r.vigente_hasta IS NULL OR r.vigente_hasta > ?)
      ) ordenadas WHERE rn = 1
    ) rv ON rv.criminal_id = c.id
   WHERE m.activo = 1
   GROUP BY m.id, m.nombre, m.tipo
   ORDER BY m.tipo ASC, m.nombre ASC`;

export const SQL_GUARDAR_INSTANTANEA = `
  INSERT INTO reportes_recompensas
    (id, periodo, mar_id, mar_nombre, total_acumulado, cantidad_criminales, generado_por, generado_en)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE mar_nombre = VALUES(mar_nombre), total_acumulado = VALUES(total_acumulado),
    cantidad_criminales = VALUES(cantidad_criminales), generado_por = VALUES(generado_por),
    generado_en = VALUES(generado_en)`;

export const SQL_INSTANTANEAS = `
  SELECT periodo, mar_id AS marId, mar_nombre AS marNombre, total_acumulado AS totalAcumulado,
         cantidad_criminales AS cantidadCriminales, generado_por AS generadoPor, generado_en AS generadoEn
    FROM reportes_recompensas
   ORDER BY periodo DESC, mar_nombre ASC
   LIMIT 600`;

/** Columnas de conteo comunes a las tres tendencias. */
const CONTEOS = `
  COUNT(c.id) AS totalCriminales,
  COALESCE(SUM(c.estado = 'ACTIVO'), 0) AS activos,
  COALESCE(SUM(c.estado = 'CAPTURADO'), 0) AS capturados,
  COALESCE(SUM(c.estado = 'MUERTO'), 0) AS muertos,
  COALESCE(SUM(CASE WHEN c.estado = 'ACTIVO' THEN c.recompensa_vigente_monto END), 0) AS recompensaActiva`;

/** Parametro: desde (avistamientos recientes). */
export const SQL_TENDENCIA_ZONA = `
  SELECT COALESCE(z.nombre, 'Sin zona') AS grupo, COALESCE(m.nombre, 'Sin mar') AS subgrupo, ${CONTEOS},
         COALESCE(MAX(av.n), 0) AS avistamientosRecientes
    FROM criminales c
    LEFT JOIN zonas_influencia z ON z.id = c.zona_influencia_id
    LEFT JOIN mares m ON m.id = z.mar_id
    LEFT JOIN (SELECT zona_influencia_id, COUNT(*) AS n FROM avistamientos
                WHERE fecha_hora >= ? GROUP BY zona_influencia_id) av
           ON av.zona_influencia_id = c.zona_influencia_id
   GROUP BY z.id, z.nombre, m.nombre
   ORDER BY recompensaActiva DESC, totalCriminales DESC`;

export const SQL_TENDENCIA_NIVEL = `
  SELECT c.nivel_amenaza AS grupo, NULL AS subgrupo, ${CONTEOS},
         COALESCE(MAX(av.n), 0) AS avistamientosRecientes
    FROM criminales c
    LEFT JOIN (SELECT c2.nivel_amenaza, COUNT(*) AS n FROM avistamientos a
                 JOIN criminales c2 ON c2.id = a.criminal_id
                WHERE a.fecha_hora >= ? GROUP BY c2.nivel_amenaza) av
           ON av.nivel_amenaza = c.nivel_amenaza
   GROUP BY c.nivel_amenaza
   ORDER BY FIELD(c.nivel_amenaza, 'ALTO', 'MEDIO', 'BAJO', 'PENDIENTE')`;

/**
 * Una sola afiliacion por criminal: la de mayor rango (LIDER > OFICIAL >
 * MIEMBRO) y, a igual rango, la mas antigua. Sin esto, un criminal con dos
 * membresias vigentes se contaba (y su recompensa se sumaba) en las dos, y el
 * total del reporte superaba al numero real de criminales.
 */
const MEMBRESIA_PRINCIPAL = `
  (SELECT criminal_id, organizacion_id FROM (
     SELECT mb.criminal_id, mb.organizacion_id,
            ROW_NUMBER() OVER (PARTITION BY mb.criminal_id
                               ORDER BY FIELD(mb.rol, 'LIDER', 'OFICIAL', 'MIEMBRO'),
                                        mb.fecha_ingreso, mb.id) AS rn
       FROM membresias mb WHERE mb.vigente = 1) ranqueadas
    WHERE rn = 1)`;

export const SQL_TENDENCIA_AFILIACION = `
  SELECT COALESCE(o.categoria, 'SIN_AFILIACION') AS grupo, COALESCE(o.nombre, 'Sin afiliacion') AS subgrupo,
         ${CONTEOS}, COALESCE(MAX(av.n), 0) AS avistamientosRecientes
    FROM criminales c
    LEFT JOIN ${MEMBRESIA_PRINCIPAL} mb ON mb.criminal_id = c.id
    LEFT JOIN organizaciones o ON o.id = mb.organizacion_id
    LEFT JOIN (SELECT mb2.organizacion_id, COUNT(*) AS n FROM avistamientos a
                 JOIN ${MEMBRESIA_PRINCIPAL} mb2 ON mb2.criminal_id = a.criminal_id
                WHERE a.fecha_hora >= ? GROUP BY mb2.organizacion_id) av
           ON av.organizacion_id <=> o.id
   GROUP BY o.id, o.categoria, o.nombre
   ORDER BY recompensaActiva DESC, totalCriminales DESC`;

export const SQL_RESUMEN = `
  SELECT
    (SELECT COUNT(*) FROM criminales WHERE estado = 'ACTIVO') AS criminalesActivos,
    (SELECT COUNT(*) FROM criminales WHERE estado = 'CAPTURADO') AS criminalesCapturados,
    (SELECT COUNT(*) FROM criminales WHERE estado = 'MUERTO') AS criminalesMuertos,
    (SELECT COALESCE(SUM(recompensa_vigente_monto), 0) FROM criminales WHERE estado = 'ACTIVO')
      AS recompensaActivaTotal,
    (SELECT COUNT(*) FROM reportes_ciudadanos WHERE estado = 'PENDIENTE') AS reportesPendientes,
    (SELECT COUNT(*) FROM avistamientos WHERE estado_verificacion = 'PENDIENTE') AS avistamientosPendientes,
    (SELECT COUNT(*) FROM recompensas WHERE estado = 'PENDIENTE_VALIDACION') AS recompensasPorValidar`;

export const SQL_POR_NIVEL = `
  SELECT nivel_amenaza AS etiqueta, COUNT(*) AS valor FROM criminales
   WHERE estado = 'ACTIVO' GROUP BY nivel_amenaza`;

export const SQL_POR_ESTADO = `SELECT estado AS etiqueta, COUNT(*) AS valor FROM criminales GROUP BY estado`;

export const SQL_POR_MAR = `
  SELECT m.nombre AS etiqueta, COUNT(c.id) AS valor
    FROM mares m
    LEFT JOIN zonas_influencia z ON z.mar_id = m.id
    LEFT JOIN criminales c ON c.zona_influencia_id = z.id AND c.estado = 'ACTIVO'
   WHERE m.activo = 1
   GROUP BY m.id, m.nombre, m.tipo
   ORDER BY m.tipo ASC, m.nombre ASC`;

export const SQL_POR_CATEGORIA = `
  SELECT COALESCE(o.categoria, 'SIN_AFILIACION') AS etiqueta, COUNT(DISTINCT c.id) AS valor
    FROM criminales c
    LEFT JOIN membresias mb ON mb.criminal_id = c.id AND mb.vigente = 1
    LEFT JOIN organizaciones o ON o.id = mb.organizacion_id
   WHERE c.estado = 'ACTIVO'
   GROUP BY COALESCE(o.categoria, 'SIN_AFILIACION')
   ORDER BY valor DESC`;

/**
 * El mes se calcula en la zona horaria de la sesion MySQL, que es la misma del
 * servidor y de la aplicacion (database.config.ts usa timezone 'local'). En los
 * equipos del equipo (XAMPP) es hora de Colombia. Parametro: desde.
 */
export const SQL_AVISTAMIENTOS_POR_MES = `
  SELECT DATE_FORMAT(fecha_hora, '%Y-%m') AS etiqueta, COUNT(*) AS valor
    FROM avistamientos
   WHERE fecha_hora >= ?
   GROUP BY etiqueta
   ORDER BY etiqueta`;
