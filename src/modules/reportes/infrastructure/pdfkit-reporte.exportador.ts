import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { ReportePdfPort } from '../domain/reportes-lectura.port';
import type { ColumnaReporte, TablaReporte } from '../domain/reportes.types';

const MARGEN = 40;
const ALTO_FILA = 20;
const COLOR_ENCABEZADO = '#1F3A5F';
const COLOR_ZEBRA = '#EEF2F7';

function formatear(valor: string | number | null | undefined, columna: ColumnaReporte): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor !== 'number') return valor;
  const texto = Math.round(valor).toLocaleString('es-CO');
  return columna.tipo === 'moneda' ? `${texto} B` : texto;
}

/**
 * RF "exportar reportes en PDF". Tabla horizontal (A4 apaisado) con encabezado
 * de color, filas alternas, fila de totales y salto de pagina automatico.
 */
@Injectable()
export class PdfkitReporteExportador implements ReportePdfPort {
  generar(tabla: TablaReporte): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: MARGEN,
      info: { Title: tabla.titulo },
    });
    const partes: Buffer[] = [];
    const terminado = new Promise<Buffer>((resolver, rechazar) => {
      doc.on('data', (parte: Buffer) => partes.push(parte));
      doc.on('end', () => resolver(Buffer.concat(partes)));
      doc.on('error', rechazar);
    });

    const ancho = doc.page.width - MARGEN * 2;
    const anchoColumna = ancho / tabla.columnas.length;

    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(COLOR_ENCABEZADO)
      .text('MARINA - Sistema de Gestion de Recompensas');
    doc.fontSize(13).fillColor('#000000').text(tabla.titulo);
    doc.font('Helvetica').fontSize(9).fillColor('#555555').text(tabla.subtitulo).moveDown(0.8);

    let y = doc.y;
    const fila = (valores: string[], estilo: 'encabezado' | 'normal' | 'zebra' | 'total'): void => {
      if (y + ALTO_FILA > doc.page.height - MARGEN) {
        doc.addPage();
        y = MARGEN;
      }
      if (estilo !== 'normal') {
        const color =
          estilo === 'encabezado' ? COLOR_ENCABEZADO : estilo === 'total' ? '#D9E1EC' : COLOR_ZEBRA;
        doc.rect(MARGEN, y, ancho, ALTO_FILA).fill(color);
      }
      doc
        .font(estilo === 'encabezado' || estilo === 'total' ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9)
        .fillColor(estilo === 'encabezado' ? '#FFFFFF' : '#000000');
      valores.forEach((valor, i) => {
        const alineacion = tabla.columnas[i].tipo === 'texto' ? 'left' : 'right';
        doc.text(valor, MARGEN + i * anchoColumna + 4, y + 6, {
          width: anchoColumna - 8,
          align: alineacion,
          lineBreak: false,
          ellipsis: true,
        });
      });
      y += ALTO_FILA;
    };

    fila(
      tabla.columnas.map((c) => c.titulo),
      'encabezado',
    );
    tabla.filas.forEach((datos, i) =>
      fila(
        tabla.columnas.map((c) => formatear(datos[c.clave], c)),
        i % 2 ? 'zebra' : 'normal',
      ),
    );
    if (tabla.totales) {
      fila(
        tabla.columnas.map((c) => formatear(tabla.totales?.[c.clave], c)),
        'total',
      );
    }
    if (tabla.filas.length === 0) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(10)
        .fillColor('#555555')
        .text('Sin datos para este reporte.', MARGEN, y + 8);
    }

    doc.end();
    return terminado;
  }
}
