import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { STORAGE_PORT, type StoragePort } from '../../../shared/domain/storage/storage.port';
import {
  CARTEL_RENDERER,
  type CartelRendererPort,
  type DatosCartel,
  type FormatoCartel,
} from '../domain/cartel-renderer.port';
import { CARTEL_REPOSITORY, type CartelRepositoryPort } from '../domain/cartel.repository.port';
import { rutaDesdeUrl } from '../domain/instantanea-cartel';

export interface DescargarCartelInput {
  readonly cartelId: string;
  readonly formato: FormatoCartel;
}

export interface ArchivoDescarga {
  readonly contenido: Buffer;
  readonly mime: string;
  readonly nombreArchivo: string;
}

/**
 * RF-2 "descargar, imprimir o exportar el cartel en formato PDF o imagen".
 *
 * PDF: se entrega el archivo guardado al generar la version (lo que se imprimio).
 * Si el archivo ya no esta en disco, se vuelve a dibujar desde la instantanea.
 * SVG: se dibuja al vuelo desde la instantanea de ESA version, asi la imagen
 * siempre coincide con el PDF de la misma version.
 */
@Injectable()
export class DescargarCartelUseCase implements UseCase<DescargarCartelInput, ArchivoDescarga> {
  constructor(
    @Inject(CARTEL_REPOSITORY) private readonly carteles: CartelRepositoryPort,
    @Inject(CARTEL_RENDERER) private readonly renderer: CartelRendererPort,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async execute(input: DescargarCartelInput): Promise<ArchivoDescarga> {
    const cartel = await this.carteles.buscarPorId(input.cartelId);
    if (!cartel) {
      throw new NotFoundError('cartel', input.cartelId);
    }

    const nombreArchivo = `cartel-${cartel.criminalId}-v${cartel.numeroVersion}.${input.formato}`;
    const ruta = rutaDesdeUrl(cartel.archivo.url);

    if (input.formato === 'pdf' && (await this.storage.existe(ruta))) {
      return { contenido: await this.storage.leer(ruta), mime: 'application/pdf', nombreArchivo };
    }

    const datos = cartel.datosInstantanea as unknown as DatosCartel;
    const { contenido, mime } = await this.renderer.renderizar(datos, input.formato);
    return { contenido, mime, nombreArchivo };
  }
}
