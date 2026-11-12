import { Injectable } from '@nestjs/common';
import type {
  CartelRendererPort,
  CartelRenderizado,
  DatosCartel,
  FormatoCartel,
} from '../domain/cartel-renderer.port';
import { FotoCartelLoader } from './foto-cartel.loader';
import { PdfkitCartelRenderer } from './pdfkit-cartel.renderer';
import { SvgCartelRenderer } from './svg-cartel.renderer';

/** Implementa CARTEL_RENDERER: carga la foto una vez y delega en el formato pedido. */
@Injectable()
export class CartelRendererAdapter implements CartelRendererPort {
  constructor(
    private readonly fotos: FotoCartelLoader,
    private readonly pdf: PdfkitCartelRenderer,
    private readonly svg: SvgCartelRenderer,
  ) {}

  async renderizar(datos: DatosCartel, formato: FormatoCartel): Promise<CartelRenderizado> {
    const foto = await this.fotos.cargar(datos.fotoUrl);
    if (formato === 'svg') {
      return { contenido: this.svg.renderizar(datos, foto), mime: 'image/svg+xml' };
    }
    return { contenido: await this.pdf.renderizar(datos, foto), mime: 'application/pdf' };
  }
}
