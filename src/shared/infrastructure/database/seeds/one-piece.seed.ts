/* eslint-disable no-console */
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { PERMISOS_POR_ROL } from '../../../domain/rbac/permiso.enum';
import { RolCodigo, ROLES_CON_MFA_OBLIGATORIO } from '../../../domain/rbac/rol.enum';

/**
 * Siembra los siete roles del Caso 13 con su matriz de permisos y un usuario
 * por rol para probar RBAC. Es idempotente: se puede correr varias veces.
 *
 * Los criminales, mares, zonas y bases de prueba siguen viniendo de
 * database/schema.sql del repositorio original.
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

async function main(): Promise<void> {
  await dataSource.initialize();
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

    const email = `${codigo.toLowerCase()}@marina.gov`;
    await dataSource.query(
      `INSERT INTO usuarios (id, nombre_completo, email, password_hash, rol_id, estado,
         mfa_habilitado, version)
       VALUES (?, ?, ?, ?, ?, 'ACTIVO', ?, 1)
       ON DUPLICATE KEY UPDATE rol_id = VALUES(rol_id), password_hash = VALUES(password_hash)`,
      [`u-${codigo.toLowerCase()}`, NOMBRES_ROL[codigo], email, passwordHash, rolId, requiere2fa],
    );

    console.warn(`Rol y usuario sembrados: ${codigo} (${email} / Marina.2026)`);
  }

  await dataSource.destroy();
  console.warn('Seed completado.');
}

main().catch((error) => {
  console.error('Seed fallido:', error);
  process.exit(1);
});
