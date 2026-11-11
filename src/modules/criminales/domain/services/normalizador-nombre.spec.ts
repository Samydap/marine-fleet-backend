import { normalizarNombre } from './normalizador-nombre';

describe('normalizarNombre', () => {
  it('quita acentos, puntuacion y mayusculas', () => {
    expect(normalizarNombre('Monkey D. Luffy')).toBe('monkey d luffy');
  });

  it('colapsa espacios repetidos', () => {
    expect(normalizarNombre('  Roronoa    Zoro  ')).toBe('roronoa zoro');
  });

  it('considera iguales dos escrituras del mismo nombre', () => {
    expect(normalizarNombre('Monkey D. Luffy')).toBe(normalizarNombre('monkey d  luffy'));
  });

  it('conserva los digitos', () => {
    expect(normalizarNombre('Base G-16')).toBe('base g 16');
  });
});
