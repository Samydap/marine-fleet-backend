export const NOMBRES_LOOKUP = Symbol('NOMBRES_LOOKUP');

export interface CriminalNombrado {
  readonly nombre: string;
  readonly fotoUrl: string | null;
}

/**
 * Traduce ids a nombres legibles para enriquecer respuestas (una recompensa
 * trae `criminalId`; la pantalla necesita "Monkey D. Luffy").
 *
 * Es de SOLO LECTURA y por lotes: una consulta por tipo, nunca una por fila
 * (evita el N+1). Un id que no existe simplemente no aparece en el mapa.
 */
export interface NombresLookupPort {
  usuarios(ids: readonly (string | null | undefined)[]): Promise<Map<string, string>>;
  criminales(ids: readonly (string | null | undefined)[]): Promise<Map<string, CriminalNombrado>>;
  bases(ids: readonly (string | null | undefined)[]): Promise<Map<string, string>>;
}
