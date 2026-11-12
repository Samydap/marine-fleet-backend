import { DomainError } from '../../../shared/domain/errors/domain.error';

/**
 * Periodos mensuales `YYYY-MM` en hora de Colombia (UTC-5, sin horario de verano).
 * Funciones puras: se prueban sin base de datos.
 */
const FORMATO = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DESFASE_MS = 5 * 60 * 60 * 1000;

export function periodoDe(fecha: Date): string {
  const local = new Date(fecha.getTime() - DESFASE_MS);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Inicio (incluido) y fin (excluido) del mes, como instantes UTC. */
export function rangoDePeriodo(periodo: string): { inicio: Date; fin: Date } {
  const coincidencia = FORMATO.exec(periodo);
  if (!coincidencia) {
    throw new DomainError('El periodo debe tener el formato YYYY-MM.', 'PERIODO_INVALIDO');
  }
  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]) - 1;
  return {
    inicio: new Date(Date.UTC(anio, mes, 1) + DESFASE_MS),
    fin: new Date(Date.UTC(anio, mes + 1, 1) + DESFASE_MS),
  };
}

/**
 * Fecha de corte del reporte: el fin del mes, o ahora si el mes esta en curso.
 * Un mes futuro no tiene reporte.
 */
export function fechaDeCorte(periodo: string, ahora: Date = new Date()): Date {
  const { inicio, fin } = rangoDePeriodo(periodo);
  if (inicio > ahora) {
    throw new DomainError('No se puede generar el reporte de un mes futuro.', 'PERIODO_FUTURO');
  }
  return fin > ahora ? ahora : new Date(fin.getTime() - 1);
}

/** Los ultimos `n` periodos terminando en el actual, del mas antiguo al mas reciente. */
export function ultimosPeriodos(n: number, ahora: Date = new Date()): string[] {
  const local = new Date(ahora.getTime() - DESFASE_MS);
  return Array.from({ length: n }, (_, i) => {
    const fecha = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - (n - 1 - i), 1));
    return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}
