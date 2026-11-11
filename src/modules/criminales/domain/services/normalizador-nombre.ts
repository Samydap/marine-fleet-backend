/**
 * Alimenta `criminales.nombre_normalizado`, que tiene UNIQUE en el esquema:
 * evita que "Monkey D. Luffy" y "monkey d luffy" entren como dos criminales.
 *
 * Logica de dominio pura: sin dependencias, trivial de probar.
 */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
