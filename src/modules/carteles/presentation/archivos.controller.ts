import { Controller, Get, Inject, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { STORAGE_PORT, type StoragePort } from '../../../shared/domain/storage/storage.port';
import { enviarArchivo } from './enviar-archivo';

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  csv: 'text/csv; charset=utf-8',
};

/** Express 5 entrega el comodin como arreglo de segmentos; Express 4 como texto. */
const unir = (ruta: string | string[]): string => (Array.isArray(ruta) ? ruta.join('/') : ruta);

/**
 * Sirve los archivos del almacenamiento (`/api/v1/archivos/<ruta>`), que es la
 * URL que devuelve STORAGE_PORT al guardar.
 *
 * Carteles y fotos son @Public() a proposito: un cartel de SE BUSCA es publico
 * por naturaleza y un <img> del navegador no puede mandar el header
 * Authorization. Cualquier otra carpeta exige sesion. El adaptador de
 * almacenamiento ya bloquea rutas con `..` (path traversal).
 */
@ApiTags('carteles')
@Controller({ path: 'archivos', version: '1' })
export class ArchivosController {
  constructor(@Inject(STORAGE_PORT) private readonly storage: StoragePort) {}

  @Public()
  @Get('carteles/*ruta')
  @ApiOperation({ summary: 'Descarga publica de un cartel guardado' })
  cartel(@Param('ruta') ruta: string | string[], @Res() res: Response): Promise<void> {
    return this.servir(`carteles/${unir(ruta)}`, res);
  }

  @Public()
  @Get('fotos/*ruta')
  @ApiOperation({ summary: 'Descarga publica de la foto de un criminal' })
  foto(@Param('ruta') ruta: string | string[], @Res() res: Response): Promise<void> {
    return this.servir(`fotos/${unir(ruta)}`, res);
  }

  @Get('*ruta')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Descarga autenticada de cualquier otro archivo' })
  otro(@Param('ruta') ruta: string | string[], @Res() res: Response): Promise<void> {
    return this.servir(unir(ruta), res);
  }

  private async servir(ruta: string, res: Response): Promise<void> {
    if (!(await this.storage.existe(ruta))) {
      throw new NotFoundException('El archivo no existe.');
    }
    const extension = ruta.split('.').pop()?.toLowerCase() ?? '';
    enviarArchivo(
      res,
      {
        contenido: await this.storage.leer(ruta),
        mime: MIME[extension] ?? 'application/octet-stream',
        nombreArchivo: ruta.split('/').pop() ?? 'archivo',
      },
      'inline',
    );
  }
}
