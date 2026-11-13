import { Injectable } from '@nestjs/common';
import { CatalogosService } from '../../catalogos/catalogos.service';
import type { ContextoZonaPort } from '../domain/contexto-zona.port';
import type { ContextoZona } from '../domain/motor-clasificacion';

/**
 * Adaptador: la geografia la sabe Catalogos (dueño de mares y zonas). Si
 * manana la sensibilidad de una zona viene de otra fuente, cambia este archivo.
 */
@Injectable()
export class CatalogosContextoZonaAdapter implements ContextoZonaPort {
  constructor(private readonly catalogos: CatalogosService) {}

  obtener(zonaInfluenciaId: string): Promise<ContextoZona | null> {
    return this.catalogos.obtenerContextoZona(zonaInfluenciaId);
  }
}
