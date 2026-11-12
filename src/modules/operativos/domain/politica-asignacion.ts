import { DomainError } from '../../../shared/domain/errors/domain.error';

/** Lo minimo de una base naval que la politica necesita conocer. */
export interface BaseCandidata {
  readonly id: string;
  readonly zonaInfluenciaId: string;
  readonly activa: boolean;
}

/**
 * RF-4. Que base lidera un operativo cuando el coordinador no la indica.
 *
 * Regla: lidera una base ACTIVA de la zona de influencia del objetivo. Si en
 * esa zona no hay base, lidera una base activa de la misma zona del operativo;
 * si tampoco, el coordinador debe elegirla a mano.
 *
 * Funcion pura: se prueba sin base de datos.
 */
export function sugerirBaseLider(
  zonasPreferidas: readonly (string | null)[],
  bases: readonly BaseCandidata[],
): string {
  const activas = bases.filter((b) => b.activa);

  for (const zona of zonasPreferidas) {
    if (!zona) continue;
    const enZona = activas.find((b) => b.zonaInfluenciaId === zona);
    if (enZona) return enZona.id;
  }

  throw new DomainError(
    'No hay una base naval activa en la zona del objetivo: indica la base lider.',
    'SIN_BASE_LIDER',
  );
}

/** Codigo legible y unico por año: OP-2026-0001. */
export function generarCodigoOperativo(anio: number, secuencia: number): string {
  return `OP-${anio}-${String(secuencia).padStart(4, '0')}`;
}
