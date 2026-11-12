import { DomainError } from '../../../shared/domain/errors/domain.error';
import { aCsv } from './csv';
import { fechaDeCorte, periodoDe, rangoDePeriodo, ultimosPeriodos } from './periodo';

const AHORA = new Date('2026-11-11T20:00:00Z');

describe('periodos mensuales (hora de Colombia)', () => {
  it('el 1 de diciembre a las 02:00 UTC todavia es noviembre en Colombia', () => {
    expect(periodoDe(new Date('2026-12-01T02:00:00Z'))).toBe('2026-11');
  });

  it('el rango de un mes empieza y termina a medianoche de Colombia', () => {
    const { inicio, fin } = rangoDePeriodo('2026-02');
    expect(inicio.toISOString()).toBe('2026-02-01T05:00:00.000Z');
    expect(fin.toISOString()).toBe('2026-03-01T05:00:00.000Z');
  });

  it('el corte del mes en curso es ahora; el de un mes pasado, su ultimo instante', () => {
    expect(fechaDeCorte('2026-11', AHORA)).toEqual(AHORA);
    expect(fechaDeCorte('2026-10', AHORA).toISOString()).toBe('2026-11-01T04:59:59.999Z');
  });

  it('rechaza meses futuros y formatos invalidos', () => {
    expect(() => fechaDeCorte('2027-01', AHORA)).toThrow('futuro');
    expect(() => rangoDePeriodo('2026-13')).toThrow(DomainError);
  });

  it('lista los ultimos 6 periodos en orden', () => {
    expect(ultimosPeriodos(6, AHORA)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
  });
});

describe('aCsv', () => {
  it('usa BOM, punto y coma, comillas cuando hace falta y fila de totales', () => {
    const csv = aCsv({
      titulo: 't',
      subtitulo: 's',
      nombreArchivo: 'x',
      columnas: [
        { clave: 'mar', titulo: 'Mar', tipo: 'texto' },
        { clave: 'total', titulo: 'Total', tipo: 'moneda' },
      ],
      filas: [
        { mar: 'East Blue', total: 101_000_000 },
        { mar: 'Mar; "raro"', total: 10.5 },
      ],
      totales: { mar: 'TOTAL', total: 101_000_010.5 },
    }).toString('utf8');

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Mar;Total',
      'East Blue;101000000',
      '"Mar; ""raro""";10,50',
      'TOTAL;101000010,50',
      '',
    ]);
  });
});
