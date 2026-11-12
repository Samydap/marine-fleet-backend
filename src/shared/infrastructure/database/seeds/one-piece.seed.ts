/* eslint-disable no-console */
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { clasificarAmenaza, type CriterioVigente } from '../../../../modules/amenaza/domain/motor-clasificacion';
import { PERMISOS_POR_ROL } from '../../../domain/rbac/permiso.enum';
import { RolCodigo, ROLES_CON_MFA_OBLIGATORIO } from '../../../domain/rbac/rol.enum';
import { NivelAmenaza } from '../../../domain/value-objects/nivel-amenaza.enum';
import {
  ANTECEDENTES,
  AVISTAMIENTOS,
  BASES,
  CRIMINALES,
  MARES,
  ORGANIZACIONES,
  RECOMPENSAS_EXTRA,
  REPORTES,
  ZONAS,
} from './one-piece.data';

/**
 * Siembra el universo de prueba completo: catalogos (mares, zonas, bases), los
 * siete roles con su matriz de permisos, un usuario por rol, organizaciones de
 * las tres categorias, criminales con recompensa, antecedentes, avistamientos y
 * criterios de amenaza.
 *
 * Es IDEMPOTENTE: se puede correr varias veces. Roles y usuarios se actualizan
 * (por si cambio la matriz de permisos); el resto usa INSERT IGNORE.
 *
 * El nivel de amenaza de cada criminal se calcula con el MISMO motor que usa la
 * aplicacion (modules/amenaza/domain/motor-clasificacion.ts), asi los datos de
 * prueba nunca contradicen la regla de negocio.
 */
const NOMBRES_ROL: Record<RolCodigo, string> = {
  [RolCodigo.ALMIRANTE]: 'Almirante de la Marina',
  [RolCodigo.DIRECTOR_INTELIGENCIA]: 'Director de Inteligencia',
  [RolCodigo.ANALISTA_DATOS_CRIMINALES]: 'Analista de Datos Criminales',
  [RolCodigo.COORDINADOR_OPERACIONES]: 'Coordinador de Operaciones',
  [RolCodigo.DESARROLLADOR_BACKEND]: 'Desarrollador Backend',
  [RolCodigo.ESPECIALISTA_SEGURIDAD]: 'Especialista en Seguridad Informatica',
  [RolCodigo.CAPITAN]: 'Capitan de Base',
};

/** Base asignada a cada usuario de prueba. Null = rol global (ve todas las bases). */
const BASE_POR_ROL: Partial<Record<RolCodigo, string>> = {
  [RolCodigo.COORDINADOR_OPERACIONES]: 'b-marineford',
  [RolCodigo.CAPITAN]: 'b-loguetown',
};

const CRITERIOS: Array<CriterioVigente & { id: string }> = [
  { id: 'ca-bajo', nivel: NivelAmenaza.BAJO, montoMinimo: 1, montoMaximo: 99_999_999 },
  { id: 'ca-medio', nivel: NivelAmenaza.MEDIO, montoMinimo: 100_000_000, montoMaximo: 999_999_999 },
  { id: 'ca-alto', nivel: NivelAmenaza.ALTO, montoMinimo: 1_000_000_000, montoMaximo: null },
];

const ZONAS_SENSIBLES = /sabaody|marineford|mary geoise/i;

async function sembrarCatalogos(): Promise<void> {
  for (const mar of MARES) {
    await dataSource.query(`INSERT IGNORE INTO mares (id, nombre, tipo, activo) VALUES (?, ?, ?, 1)`, [
      mar.id,
      mar.nombre,
      mar.tipo,
    ]);
  }
  for (const zona of ZONAS) {
    await dataSource.query(
      `INSERT IGNORE INTO zonas_influencia (id, mar_id, nombre, descripcion, activo) VALUES (?, ?, ?, ?, 1)`,
      [zona.id, zona.marId, zona.nombre, zona.descripcion],
    );
  }
  for (const base of BASES) {
    await dataSource.query(
      `INSERT IGNORE INTO bases_navales (id, nombre, zona_influencia_id, ubicacion, comandante_nombre, estado)
       VALUES (?, ?, ?, ?, ?, 'ACTIVA')`,
      [base.id, base.nombre, base.zonaId, base.ubicacion, base.comandante],
    );
  }
  console.warn(`Catalogos: ${MARES.length} mares, ${ZONAS.length} zonas, ${BASES.length} bases.`);
}

async function sembrarRolesYUsuarios(): Promise<void> {
  const passwordHash = await bcrypt.hash('Marina.2026', 10);

  for (const codigo of Object.values(RolCodigo)) {
    const rolId = `r-${codigo.toLowerCase()}`;
    const requiere2fa = ROLES_CON_MFA_OBLIGATORIO.includes(codigo) ? 1 : 0;

    await dataSource.query(
      `INSERT INTO roles (id, codigo, nombre, descripcion, permisos, requiere_2fa, activo)
       VALUES (?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), permisos = VALUES(permisos),
         requiere_2fa = VALUES(requiere_2fa)`,
      [
        rolId,
        codigo,
        NOMBRES_ROL[codigo],
        `Rol ${NOMBRES_ROL[codigo]} del Caso 13`,
        JSON.stringify(PERMISOS_POR_ROL[codigo]),
        requiere2fa,
      ],
    );

    // MFA queda deshabilitado en los usuarios de prueba: no tienen secreto TOTP
    // enrolado y la demo debe poder entrar solo con contraseña.
    const email = `${codigo.toLowerCase()}@marina.gov`;
    await dataSource.query(
      `INSERT INTO usuarios (id, nombre_completo, email, password_hash, rol_id, base_naval_id,
         estado, mfa_habilitado, intentos_fallidos, version)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO', 0, 0, 1)
       ON DUPLICATE KEY UPDATE rol_id = VALUES(rol_id), password_hash = VALUES(password_hash),
         base_naval_id = VALUES(base_naval_id), estado = 'ACTIVO', intentos_fallidos = 0`,
      [`u-${codigo.toLowerCase()}`, NOMBRES_ROL[codigo], email, passwordHash, rolId, BASE_POR_ROL[codigo] ?? null],
    );

    console.warn(`Rol y usuario: ${codigo} (${email} / Marina.2026)`);
  }
}

async function sembrarCriterios(): Promise<void> {
  for (const c of CRITERIOS) {
    await dataSource.query(
      `INSERT IGNORE INTO criterios_amenaza (id, nivel, monto_minimo, monto_maximo, vigente, motivo)
       VALUES (?, ?, ?, ?, 1, 'Criterio inicial del sistema')`,
      [c.id, c.nivel, c.montoMinimo, c.montoMaximo],
    );
  }
}

async function sembrarCriminales(): Promise<void> {
  const analista = 'u-analista_datos_criminales';
  const zonasGrandLine = new Set<string>(
    ZONAS.filter((z) => MARES.find((m) => m.id === z.marId)?.tipo === 'GRAND_LINE').map((z) => z.id),
  );

  for (const org of ORGANIZACIONES) {
    await dataSource.query(
      `INSERT IGNORE INTO organizaciones (id, nombre, tipo_agrupacion, categoria, zona_influencia_id, descripcion, activa)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [org.id, org.nombre, org.tipo, org.categoria, org.zonaId, org.descripcion],
    );
  }

  for (const c of CRIMINALES) {
    const zona = ZONAS.find((z) => z.id === c.zonaId);
    const nivel = clasificarAmenaza(c.recompensa, CRITERIOS, {
      esGrandLine: zonasGrandLine.has(c.zonaId),
      cercanaACuartelGeneral: ZONAS_SENSIBLES.test(zona?.nombre ?? ''),
    }).nivel;

    await dataSource.query(
      `INSERT IGNORE INTO criminales (id, nombre, nombre_normalizado, alias, edad, descripcion_fisica,
         estado, fecha_baja, zona_influencia_id, recompensa_vigente_monto, nivel_amenaza, origen_base_id,
         creado_por, actualizado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        c.nombre,
        c.nombreNormalizado,
        JSON.stringify(c.alias),
        c.edad,
        c.descripcion,
        c.estado,
        c.estado === 'ACTIVO' ? null : new Date('2026-06-01T00:00:00Z'),
        c.zonaId,
        c.recompensa,
        nivel,
        c.baseOrigen,
        analista,
        analista,
      ],
    );

    if (c.organizacionId) {
      await dataSource.query(
        `INSERT IGNORE INTO membresias (id, criminal_id, organizacion_id, rol, vigente, fecha_ingreso, creado_por)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        [`m-${c.id}`, c.id, c.organizacionId, c.rolOrganizacion, new Date('2024-01-01T00:00:00Z'), analista],
      );
    }

    if (c.recompensa !== null) {
      await dataSource.query(
        `INSERT IGNORE INTO recompensas (id, criminal_id, monto, moneda, estado, requiere_validacion,
           solicitada_por, validada_por, fecha_validacion, vigente_desde, motivo)
         VALUES (?, ?, ?, 'BERRIES', 'VIGENTE', ?, ?, ?, NOW(), NOW(), 'Recompensa inicial')`,
        [`rc-${c.id}`, c.id, c.recompensa, c.recompensa >= 1_000_000_000 ? 1 : 0, analista, 'u-almirante'],
      );
    }
  }

  for (const r of RECOMPENSAS_EXTRA) {
    await dataSource.query(
      `INSERT IGNORE INTO recompensas (id, criminal_id, monto, moneda, estado, requiere_validacion,
         solicitada_por, vigente_desde, vigente_hasta, motivo)
       VALUES (?, ?, ?, 'BERRIES', ?, ?, ?, ?, ?, ?)`,
      [r.id, r.criminalId, r.monto, r.estado, r.requiereValidacion ? 1 : 0, analista, r.desde, r.hasta, r.motivo],
    );
  }

  for (const a of ANTECEDENTES) {
    await dataSource.query(
      `INSERT IGNORE INTO antecedentes (id, criminal_id, tipo_delito, descripcion, fecha_hecho, ubicacion, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [a.id, a.criminalId, a.tipoDelito, a.descripcion, a.fecha, a.ubicacion, analista],
    );
  }

  console.warn(`Criminales: ${CRIMINALES.length}, organizaciones: ${ORGANIZACIONES.length}.`);
}

async function sembrarInteligencia(): Promise<void> {
  for (const a of AVISTAMIENTOS) {
    await dataSource.query(
      `INSERT IGNORE INTO avistamientos (id, criminal_id, fecha_hora, ubicacion, testigo, zona_influencia_id,
         estado_verificacion, origen, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'OFICIAL', 'u-director_inteligencia')`,
      [a.id, a.criminalId, a.fecha, a.ubicacion, a.testigo, a.zonaId, a.estado],
    );
  }
  for (const r of REPORTES) {
    await dataSource.query(
      `INSERT IGNORE INTO reportes_ciudadanos (id, criminal_id, descripcion, fecha_hecho, ubicacion,
         zona_influencia_id, informante, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDIENTE')`,
      [r.id, r.criminalId, r.descripcion, r.fecha, r.ubicacion, r.zonaId, JSON.stringify(r.informante)],
    );
  }
}

async function main(): Promise<void> {
  await dataSource.initialize();
  await sembrarCatalogos();
  await sembrarRolesYUsuarios();
  await sembrarCriterios();
  await sembrarCriminales();
  await sembrarInteligencia();
  await dataSource.destroy();
  console.warn('Seed completado. Para generar los carteles iniciales: POST /api/v1/carteles/regenerar-todos');
}

main().catch((error) => {
  console.error('Seed fallido:', error);
  process.exit(1);
});
