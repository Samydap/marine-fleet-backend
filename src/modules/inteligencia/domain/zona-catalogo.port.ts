export const ZONA_CATALOGO = Symbol('ZONA_CATALOGO');

/**
 * Lo unico que inteligencia necesita del catalogo geografico: saber si una zona
 * existe. Puerto propio para no acoplar los casos de uso al servicio de otro
 * modulo; el adaptador delega en CatalogosService.
 */
export interface ZonaCatalogoPort {
  existeZona(zonaInfluenciaId: string): Promise<boolean>;
}
