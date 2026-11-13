import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { DatosCartel } from '../domain/cartel-renderer.port';
import type { FotoCartel } from './foto-cartel.loader';
import { COLORES, FOTO, LIENZO, textosCartel } from './templates/wanted-poster.template';

/** RF-2. Dibuja el cartel WANTED en PDF (A4) con PDFKit. */
@Injectable()
export class PdfkitCartelRenderer {
  renderizar(datos: DatosCartel, foto: FotoCartel | null): Promise<Buffer> {
    const textos = textosCartel(datos);
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: { Title: `WANTED - ${datos.nombre}` },
    });
    const partes: Buffer[] = [];
    const terminado = new Promise<Buffer>((resolver, rechazar) => {
      doc.on('data', (parte: Buffer) => partes.push(parte));
      doc.on('end', () => resolver(Buffer.concat(partes)));
      doc.on('error', rechazar);
    });

    const { ancho, alto, margen } = LIENZO;
    const anchoUtil = ancho - margen * 2;

    doc.rect(0, 0, ancho, alto).fill(COLORES.papel);
    doc
      .lineWidth(6)
      .rect(margen / 2, margen / 2, ancho - margen, alto - margen)
      .stroke(COLORES.borde);
    doc
      .lineWidth(1.5)
      .rect(margen, margen, anchoUtil, alto - margen * 2)
      .stroke(COLORES.borde);

    doc.fillColor(COLORES.tinta).font('Times-Bold').fontSize(96);
    doc.text(textos.titulo, margen, 50, { width: anchoUtil, align: 'center', characterSpacing: 6 });
    doc
      .font('Times-Bold')
      .fontSize(22)
      .text(textos.subtitulo, margen, 160, { width: anchoUtil, align: 'center' });

    doc.lineWidth(4).rect(FOTO.x, FOTO.y, FOTO.ancho, FOTO.alto).stroke(COLORES.borde);
    // Una foto con cabecera valida pero contenido corrupto hace fallar a PDFKit:
    // en ese caso se imprime el recuadro vacio. Mejor un cartel sin foto que ninguno.
    let fotoDibujada = false;
    if (foto) {
      try {
        doc.image(foto.contenido, FOTO.x + 4, FOTO.y + 4, {
          fit: [FOTO.ancho - 8, FOTO.alto - 8],
          align: 'center',
          valign: 'center',
        });
        fotoDibujada = true;
      } catch {
        fotoDibujada = false;
      }
    }
    if (!fotoDibujada) {
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#8A6A45');
      doc.text('SIN FOTOGRAFIA', FOTO.x, FOTO.y + FOTO.alto / 2 - 9, {
        width: FOTO.ancho,
        align: 'center',
      });
    }

    doc.fillColor(COLORES.tinta).font('Times-Bold').fontSize(24);
    doc.text(textos.condicion, margen, 525, { width: anchoUtil, align: 'center' });
    doc.fontSize(34).text(textos.nombre, margen, 562, { width: anchoUtil, align: 'center' });
    doc
      .font('Times-Italic')
      .fontSize(14)
      .text(textos.alias, margen, 606, { width: anchoUtil, align: 'center' });
    doc
      .font('Times-Bold')
      .fontSize(36)
      .text(textos.recompensa, margen, 632, { width: anchoUtil, align: 'center' });

    doc.font('Helvetica-Bold').fontSize(13).fillColor(textos.colorNivel);
    doc.text(textos.nivel, margen, 690, { width: anchoUtil, align: 'center' });
    doc.font('Helvetica').fontSize(12).fillColor(COLORES.tinta);
    doc.text(textos.organizacion, margen, 712, { width: anchoUtil, align: 'center' });

    doc
      .font('Times-Bold')
      .fontSize(26)
      .text('MARINE', margen, 742, { width: anchoUtil, align: 'center' });
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .text(textos.legal, margen + 30, 776, { width: anchoUtil - 60, align: 'center' });

    if (textos.sello) {
      doc.save().rotate(-24, { origin: [ancho / 2, 360] });
      doc.lineWidth(6).rect(110, 315, 375, 90).stroke(COLORES.sello);
      doc.font('Helvetica-Bold').fontSize(56).fillColor(COLORES.sello);
      doc.text(textos.sello, 110, 332, { width: 375, align: 'center' });
      doc.restore();
    }

    doc.end();
    return terminado;
  }
}
