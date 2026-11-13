import { DomainError } from '../../../shared/domain/errors/domain.error';
import { parsearFechaHora } from './fecha-hora';

const AHORA = new Date('2026-11-11T20:00:00Z');

describe('parsearFechaHora (portado de la v1)', () => {
  it('interpreta datetime-local como hora de Colombia (UTC-5)', () => {
    expect(parsearFechaHora('2026-11-10T14:30', AHORA).toISOString()).toBe(
      '2026-11-10T19:30:00.000Z',
    );
  });

  it('acepta una fecha ISO con zona', () => {
    expect(parsearFechaHora('2026-11-10T14:30:00Z', AHORA).toISOString()).toBe(
      '2026-11-10T14:30:00.000Z',
    );
  });

  it.each(['10/11/2026', '2026-11-10', 'ayer', ''])('rechaza el formato "%s"', (valor) => {
    expect(() => parsearFechaHora(valor, AHORA)).toThrow(DomainError);
  });

  it('rechaza una fecha que no existe', () => {
    expect(() => parsearFechaHora('2026-02-31T10:00', AHORA)).toThrow(DomainError);
  });

  it('rechaza fechas futuras', () => {
    expect(() => parsearFechaHora('2026-12-24T10:00', AHORA)).toThrow('no puede ser futura');
  });
});
