import { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';
import type { DatosCartel } from '../domain/cartel-renderer.port';
import { PdfkitCartelRenderer } from './pdfkit-cartel.renderer';
import { SvgCartelRenderer } from './svg-cartel.renderer';

const DATOS: DatosCartel = {
  criminalId: 'c-luffy',
  nombre: 'Monkey D. Luffy',
  alias: ['Sombrero de Paja'],
  recompensa: 3_000_000_000,
  moneda: 'BERRIES',
  nivelAmenaza: NivelAmenaza.ALTO,
  estado: 'ACTIVO',
  organizacion: 'Piratas del Sombrero de Paja',
  categoriaOrganizacion: 'PIRATA',
  fotoUrl: null,
  textoLegal: 'Texto legal <con> & simbolos',
};

describe('Renderers del cartel', () => {
  it('el PDF es un documento PDF valido', async () => {
    const pdf = await new PdfkitCartelRenderer().renderizar(DATOS, null);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('el SVG muestra nombre y recompensa y escapa caracteres especiales', () => {
    const svg = new SvgCartelRenderer().renderizar(DATOS, null).toString('utf8');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('MONKEY D. LUFFY');
    expect(svg).toContain('3.000.000.000 BERRIES');
    expect(svg).toContain('&lt;con&gt; &amp;');
    expect(svg).not.toContain('CAPTURADO');
  });

  it('un criminal capturado lleva el sello CAPTURADO', () => {
    const svg = new SvgCartelRenderer()
      .renderizar({ ...DATOS, estado: 'CAPTURADO' }, null)
      .toString('utf8');
    expect(svg).toContain('CAPTURADO');
  });
});
