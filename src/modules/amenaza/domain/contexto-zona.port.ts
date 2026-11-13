import type { ContextoZona } from './motor-clasificacion';

export const CONTEXTO_ZONA_PROVIDER = Symbol('CONTEXTO_ZONA_PROVIDER');

/**
 * De donde sale el peso de la zona de influencia. La geografia pertenece al
 * modulo Catalogos; este puerto evita que los casos de uso de Amenaza dependan
 * de una clase concreta de otro modulo.
 */
export interface ContextoZonaPort {
  obtener(zonaInfluenciaId: string): Promise<ContextoZona | null>;
}
