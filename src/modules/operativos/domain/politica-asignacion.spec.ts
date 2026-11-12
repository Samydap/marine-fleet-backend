import { DomainError } from '../../../shared/domain/errors/domain.error';
import { generarCodigoOperativo, sugerirBaseLider } from './politica-asignacion';

const BASES = [
  { id: 'b-g5', zonaInfluenciaId: 'z-wano', activa: false },
  { id: 'b-g6', zonaInfluenciaId: 'z-wano', activa: true },
  { id: 'b-16', zonaInfluenciaId: 'z-alabasta', activa: true },
];

describe('politica de asignacion de operativos', () => {
  it('elige una base activa de la zona del objetivo', () => {
    expect(sugerirBaseLider(['z-wano'], BASES)).toBe('b-g6');
  });

  it('cae en la siguiente zona preferida si la primera no tiene base', () => {
    expect(sugerirBaseLider([null, 'z-sin-base', 'z-alabasta'], BASES)).toBe('b-16');
  });

  it('falla si ninguna zona tiene base activa', () => {
    expect(() => sugerirBaseLider(['z-sin-base'], BASES)).toThrow(DomainError);
  });

  it('genera el codigo con consecutivo de cuatro digitos', () => {
    expect(generarCodigoOperativo(2026, 7)).toBe('OP-2026-0007');
  });
});
