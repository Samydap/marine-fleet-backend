import { PdfkitReporteExportador } from './pdfkit-reporte.exportador';

describe('PdfkitReporteExportador', () => {
  it('genera un PDF valido aun con muchas filas (salto de pagina)', async () => {
    const pdf = await new PdfkitReporteExportador().generar({
      titulo: 'Prueba',
      subtitulo: 'sub',
      nombreArchivo: 'p',
      columnas: [
        { clave: 'a', titulo: 'A', tipo: 'texto' },
        { clave: 'b', titulo: 'B', tipo: 'moneda' },
      ],
      filas: Array.from({ length: 80 }, (_, i) => ({ a: `fila ${i}`, b: i * 1_000_000 })),
      totales: { a: 'TOTAL', b: 1 },
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
