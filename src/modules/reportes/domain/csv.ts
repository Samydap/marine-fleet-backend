import type { TablaReporte } from './reportes.types';

/**
 * Exportacion CSV pensada para Excel en español (Colombia):
 *  - separador `;` (la coma es el separador decimal en es-CO)
 *  - BOM UTF-8, para que las tildes y la ñ se vean bien al abrirlo
 *  - montos como enteros sin separador de miles, para que Excel los sume
 */
const BOM = '﻿';
const SEPARADOR = ';';

function celda(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  const texto = typeof valor === 'number' ? formatearNumero(valor) : valor;
  return /[;"\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function formatearNumero(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(2).replace('.', ',');
}

export function aCsv(tabla: TablaReporte): Buffer {
  const lineas = [
    tabla.columnas.map((c) => celda(c.titulo)).join(SEPARADOR),
    ...tabla.filas.map((fila) => tabla.columnas.map((c) => celda(fila[c.clave])).join(SEPARADOR)),
  ];
  if (tabla.totales) {
    lineas.push(tabla.columnas.map((c) => celda(tabla.totales?.[c.clave] ?? '')).join(SEPARADOR));
  }
  return Buffer.from(BOM + lineas.join('\r\n') + '\r\n', 'utf8');
}
