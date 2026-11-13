import { Injectable } from '@nestjs/common';
import { CatalogosService } from '../../catalogos/catalogos.service';
import type { ZonaCatalogoPort } from '../domain/zona-catalogo.port';

/** Implementa ZONA_CATALOGO delegando en el modulo dueño de la geografia. */
@Injectable()
export class ZonaCatalogoAdapter implements ZonaCatalogoPort {
  constructor(private readonly catalogos: CatalogosService) {}

  async existeZona(zonaInfluenciaId: string): Promise<boolean> {
    const zonas = await this.catalogos.listarZonas();
    return zonas.some((zona) => zona.id === zonaInfluenciaId);
  }
}
