import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';
import { clasificarAmenaza, type CriterioVigente } from './motor-clasificacion';

const CRITERIOS: CriterioVigente[] = [
  { nivel: NivelAmenaza.BAJO, montoMinimo: 1, montoMaximo: 99_999_999 },
  { nivel: NivelAmenaza.MEDIO, montoMinimo: 100_000_000, montoMaximo: 999_999_999 },
  { nivel: NivelAmenaza.ALTO, montoMinimo: 1_000_000_000, montoMaximo: null },
];

describe('clasificarAmenaza', () => {
  it('deja PENDIENTE a quien no tiene recompensa', () => {
    expect(clasificarAmenaza(null, CRITERIOS).nivel).toBe(NivelAmenaza.PENDIENTE);
  });

  it('clasifica por rango de bounty', () => {
    expect(clasificarAmenaza(50_000_000, CRITERIOS).nivel).toBe(NivelAmenaza.BAJO);
    expect(clasificarAmenaza(500_000_000, CRITERIOS).nivel).toBe(NivelAmenaza.MEDIO);
    expect(clasificarAmenaza(3_000_000_000, CRITERIOS).nivel).toBe(NivelAmenaza.ALTO);
  });

  it('escala el nivel cuando el criminal opera en Grand Line', () => {
    const resultado = clasificarAmenaza(500_000_000, CRITERIOS, {
      esGrandLine: true,
      cercanaACuartelGeneral: false,
    });

    expect(resultado.nivelBase).toBe(NivelAmenaza.MEDIO);
    expect(resultado.nivel).toBe(NivelAmenaza.ALTO);
    expect(resultado.escalado).toBe(true);
  });

  it('no escala por encima de ALTO', () => {
    const resultado = clasificarAmenaza(3_000_000_000, CRITERIOS, {
      esGrandLine: true,
      cercanaACuartelGeneral: true,
    });

    expect(resultado.nivel).toBe(NivelAmenaza.ALTO);
    expect(resultado.escalado).toBe(false);
  });

  it('usa el criterio mas severo si el bounty supera todos los rangos', () => {
    const sinTecho: CriterioVigente[] = [
      { nivel: NivelAmenaza.BAJO, montoMinimo: 1, montoMaximo: 100 },
      { nivel: NivelAmenaza.MEDIO, montoMinimo: 101, montoMaximo: 200 },
    ];

    expect(clasificarAmenaza(5_000, sinTecho).nivel).toBe(NivelAmenaza.MEDIO);
  });

  it('falla si no hay criterios configurados', () => {
    expect(() => clasificarAmenaza(100, [])).toThrow(DomainError);
  });
});
