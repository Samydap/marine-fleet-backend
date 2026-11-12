import { DomainError } from '../../../shared/domain/errors/domain.error';

/**
 * Portado de `parseFechaHora` de la v1 (backend/src/server.ts).
 *
 * Acepta lo que envia un <input type="datetime-local"> (`YYYY-MM-DDTHH:mm`, sin
 * zona horaria) o una fecha ISO completa. Sin zona, se interpreta como hora de
 * Colombia (UTC-5, sin horario de verano), que es donde opera el equipo.
 *
 * Rechaza fechas futuras (con 5 minutos de tolerancia por relojes desfasados):
 * no se puede haber visto a alguien manana.
 */
const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const DESFASE_COLOMBIA = '-05:00';
const TOLERANCIA_MS = 5 * 60_000;

export function parsearFechaHora(valor: string, ahora: Date = new Date()): Date {
  const texto = valor?.trim() ?? '';
  let fecha: Date;

  if (LOCAL.test(texto)) {
    fecha = new Date(`${texto.length === 16 ? `${texto}:00` : texto}${DESFASE_COLOMBIA}`);
  } else if (ISO.test(texto)) {
    fecha = new Date(texto);
  } else {
    throw new DomainError(
      'La fecha debe tener el formato YYYY-MM-DDTHH:mm o ser una fecha ISO.',
      'FECHA_INVALIDA',
    );
  }

  if (Number.isNaN(fecha.getTime()) || !diaExiste(texto)) {
    throw new DomainError('La fecha no existe en el calendario.', 'FECHA_INVALIDA');
  }
  if (fecha.getTime() > ahora.getTime() + TOLERANCIA_MS) {
    throw new DomainError('La fecha del avistamiento no puede ser futura.', 'FECHA_FUTURA');
  }
  return fecha;
}

/** `new Date` convierte el 31 de febrero en 3 de marzo: aqui se detecta. */
function diaExiste(texto: string): boolean {
  const [anio, mes, dia] = texto.slice(0, 10).split('-').map(Number);
  const calendario = new Date(Date.UTC(anio, mes - 1, dia));
  return calendario.getUTCMonth() === mes - 1 && calendario.getUTCDate() === dia;
}
