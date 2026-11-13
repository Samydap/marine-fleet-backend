import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import type {
  CriminalReaderPort,
  CriminalResumen,
} from '../../criminales/domain/criminal.repository.port';
import type { ZonaCatalogoPort } from '../domain/zona-catalogo.port';

/** Portado de `criminalExiste` de la v1: ahora pasa por el puerto de lectura. */
export async function exigirCriminal(
  criminales: CriminalReaderPort,
  criminalId: string,
): Promise<CriminalResumen> {
  const criminal = await criminales.obtenerResumen(criminalId);
  if (!criminal) {
    throw new NotFoundError('criminal', criminalId);
  }
  return criminal;
}

export async function validarZona(
  zonas: ZonaCatalogoPort,
  zonaId: string | null | undefined,
): Promise<void> {
  if (zonaId && !(await zonas.existeZona(zonaId))) {
    throw new DomainError(`La zona de influencia ${zonaId} no existe.`, 'ZONA_INVALIDA');
  }
}

/** Texto libre opcional: recortado, y null si quedo vacio. */
export function textoOpcional(valor: string | null | undefined): string | null {
  const limpio = valor?.trim();
  return limpio ? limpio : null;
}
