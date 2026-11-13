import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';
import type { CriterioVigente } from './motor-clasificacion';
import { validarCriterios } from './validador-criterios';

const VALIDOS: CriterioVigente[] = [
  { nivel: NivelAmenaza.ALTO, montoMinimo: 1_000_000_000, montoMaximo: null },
  { nivel: NivelAmenaza.BAJO, montoMinimo: 1, montoMaximo: 99_999_999 },
  { nivel: NivelAmenaza.MEDIO, montoMinimo: 100_000_000, montoMaximo: 999_999_999 },
];

describe('validarCriterios', () => {
  it('acepta un juego completo y lo devuelve ordenado por severidad', () => {
    expect(validarCriterios(VALIDOS).map((c) => c.nivel)).toEqual(['BAJO', 'MEDIO', 'ALTO']);
  });

  it('exige los tres niveles exactamente una vez', () => {
    expect(() => validarCriterios(VALIDOS.slice(0, 2))).toThrow(DomainError);
    expect(() => validarCriterios([...VALIDOS.slice(0, 2), VALIDOS[0]])).toThrow(DomainError);
  });

  it('rechaza rangos con hueco entre niveles', () => {
    const conHueco = VALIDOS.map((c) =>
      c.nivel === NivelAmenaza.MEDIO ? { ...c, montoMinimo: 150_000_000 } : c,
    );
    expect(() => validarCriterios(conHueco)).toThrow('contiguos');
  });

  it('rechaza un ALTO con techo', () => {
    const conTecho = VALIDOS.map((c) =>
      c.nivel === NivelAmenaza.ALTO ? { ...c, montoMaximo: 5_000_000_000 } : c,
    );
    expect(() => validarCriterios(conTecho)).toThrow('ALTO no debe tener');
  });

  it('rechaza un BAJO que no empieza en 1', () => {
    const desdeCero = VALIDOS.map((c) =>
      c.nivel === NivelAmenaza.BAJO ? { ...c, montoMinimo: 0 } : c,
    );
    expect(() => validarCriterios(desdeCero)).toThrow(DomainError);
  });
});
