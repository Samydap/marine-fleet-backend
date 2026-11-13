import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NivelAmenaza, SEVERIDAD } from '../../../shared/domain/value-objects/nivel-amenaza.enum';
import type { CriterioVigente } from './motor-clasificacion';

const NIVELES_REQUERIDOS = [NivelAmenaza.BAJO, NivelAmenaza.MEDIO, NivelAmenaza.ALTO] as const;

/**
 * RF-5. Regla de negocio de los criterios de clasificacion "basandose en el
 * rango numerico de su recompensa". Un juego de criterios valido:
 *  - tiene exactamente BAJO, MEDIO y ALTO (uno de cada uno);
 *  - los rangos crecen con la severidad, son contiguos (el minimo de cada nivel
 *    es el maximo del anterior + 1) y no se solapan;
 *  - BAJO empieza en 1 (0 es "sin recompensa" = PENDIENTE) y ALTO no tiene techo.
 *
 * Funcion pura: se prueba sin base de datos. Devuelve los criterios ordenados.
 */
export function validarCriterios(criterios: readonly CriterioVigente[]): CriterioVigente[] {
  const niveles = criterios.map((c) => c.nivel);
  const completos =
    criterios.length === NIVELES_REQUERIDOS.length &&
    NIVELES_REQUERIDOS.every((n) => niveles.filter((x) => x === n).length === 1);
  if (!completos) {
    throw new DomainError(
      'Debe enviarse exactamente un criterio para BAJO, MEDIO y ALTO.',
      'CRITERIOS_INCOMPLETOS',
    );
  }

  const ordenados = [...criterios].sort((a, b) => SEVERIDAD[a.nivel] - SEVERIDAD[b.nivel]);

  if (ordenados[0].montoMinimo !== 1) {
    throw new DomainError('El nivel BAJO debe empezar en 1 berry.', 'CRITERIOS_INVALIDOS');
  }
  if (ordenados[ordenados.length - 1].montoMaximo !== null) {
    throw new DomainError('El nivel ALTO no debe tener monto maximo.', 'CRITERIOS_INVALIDOS');
  }

  ordenados.forEach((actual, i) => {
    if (actual.montoMaximo !== null && actual.montoMaximo < actual.montoMinimo) {
      throw new DomainError(
        `En ${actual.nivel} el monto maximo es menor que el minimo.`,
        'CRITERIOS_INVALIDOS',
      );
    }
    const siguiente = ordenados[i + 1];
    if (
      siguiente &&
      (actual.montoMaximo === null || siguiente.montoMinimo !== actual.montoMaximo + 1)
    ) {
      throw new DomainError(
        `Los rangos deben ser contiguos: ${siguiente.nivel} debe empezar en ` +
          `${actual.montoMaximo === null ? '?' : actual.montoMaximo + 1}.`,
        'CRITERIOS_NO_CONTIGUOS',
      );
    }
  });

  return ordenados;
}
