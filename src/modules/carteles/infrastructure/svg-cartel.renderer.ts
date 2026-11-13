import { Injectable } from '@nestjs/common';
import type { DatosCartel } from '../domain/cartel-renderer.port';
import type { FotoCartel } from './foto-cartel.loader';
import { COLORES, FOTO, LIENZO, textosCartel } from './templates/wanted-poster.template';

const escapar = (texto: string): string =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Parte un texto largo en lineas de maximo `ancho` caracteres sin cortar palabras. */
function partirEnLineas(texto: string, ancho: number): string[] {
  return texto.split(' ').reduce<string[]>((lineas, palabra) => {
    const ultima = lineas[lineas.length - 1];
    if (ultima !== undefined && `${ultima} ${palabra}`.length <= ancho) {
      lineas[lineas.length - 1] = `${ultima} ${palabra}`;
    } else {
      lineas.push(palabra);
    }
    return lineas;
  }, []);
}

/**
 * RF-2 "exportar el cartel en formato imagen". SVG a mano, con la misma
 * plantilla del PDF: es una imagen vectorial que el navegador muestra en un
 * <img>, se imprime nitida y no requiere librerias nativas.
 */
@Injectable()
export class SvgCartelRenderer {
  renderizar(datos: DatosCartel, foto: FotoCartel | null): Buffer {
    const t = textosCartel(datos);
    const { ancho, alto, margen } = LIENZO;
    const centro = ancho / 2;
    const texto = (y: number, valor: string, estilo: string): string =>
      valor
        ? `<text x="${centro}" y="${y}" text-anchor="middle" ${estilo}>${escapar(valor)}</text>`
        : '';

    const imagen = foto
      ? `<image x="${FOTO.x + 4}" y="${FOTO.y + 4}" width="${FOTO.ancho - 8}" height="${FOTO.alto - 8}" ` +
        `preserveAspectRatio="xMidYMid meet" href="data:${foto.mime};base64,${foto.contenido.toString('base64')}"/>`
      : texto(
          FOTO.y + FOTO.alto / 2 + 6,
          'SIN FOTOGRAFIA',
          'font-family="Helvetica,Arial" font-weight="bold" font-size="18" fill="#8A6A45"',
        );

    const sello = t.sello
      ? `<g transform="rotate(-24 ${centro} 360)"><rect x="110" y="315" width="375" height="90" fill="none" stroke="${COLORES.sello}" stroke-width="6"/>` +
        texto(
          382,
          t.sello,
          `font-family="Helvetica,Arial" font-weight="bold" font-size="56" fill="${COLORES.sello}"`,
        ) +
        '</g>'
      : '';

    const serif = `font-family="Times New Roman,Times,serif" font-weight="bold" fill="${COLORES.tinta}"`;
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">`,
      `<rect width="${ancho}" height="${alto}" fill="${COLORES.papel}"/>`,
      `<rect x="${margen / 2}" y="${margen / 2}" width="${ancho - margen}" height="${alto - margen}" fill="none" stroke="${COLORES.borde}" stroke-width="6"/>`,
      `<rect x="${margen}" y="${margen}" width="${ancho - margen * 2}" height="${alto - margen * 2}" fill="none" stroke="${COLORES.borde}" stroke-width="1.5"/>`,
      texto(135, t.titulo, `${serif} font-size="96" letter-spacing="6"`),
      texto(182, t.subtitulo, `${serif} font-size="22"`),
      `<rect x="${FOTO.x}" y="${FOTO.y}" width="${FOTO.ancho}" height="${FOTO.alto}" fill="none" stroke="${COLORES.borde}" stroke-width="4"/>`,
      imagen,
      texto(545, t.condicion, `${serif} font-size="24"`),
      texto(592, t.nombre, `${serif} font-size="34"`),
      texto(
        620,
        t.alias,
        `font-family="Times New Roman,Times,serif" font-style="italic" font-size="14" fill="${COLORES.tinta}"`,
      ),
      texto(664, t.recompensa, `${serif} font-size="36"`),
      texto(
        702,
        t.nivel,
        `font-family="Helvetica,Arial" font-weight="bold" font-size="13" fill="${t.colorNivel}"`,
      ),
      texto(
        723,
        t.organizacion,
        `font-family="Helvetica,Arial" font-size="12" fill="${COLORES.tinta}"`,
      ),
      texto(764, 'MARINE', `${serif} font-size="26"`),
      ...partirEnLineas(t.legal, 100).map((linea, i) =>
        texto(
          786 + i * 10,
          linea,
          `font-family="Helvetica,Arial" font-size="7.5" fill="${COLORES.tinta}"`,
        ),
      ),
      sello,
      '</svg>',
    ].join('');

    return Buffer.from(svg, 'utf8');
  }
}
