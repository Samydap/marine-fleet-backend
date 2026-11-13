import type { Response } from 'express';

/**
 * Envia bytes directamente con la respuesta de Express. Se usa @Res() (modo
 * libreria) a proposito: asi la respuesta binaria NO pasa por el
 * TransformResponseInterceptor, que envolveria el archivo en { success, data }.
 */
export function enviarArchivo(
  res: Response,
  archivo: { contenido: Buffer; mime: string; nombreArchivo: string },
  disposicion: 'inline' | 'attachment' = 'attachment',
): void {
  res.setHeader('Content-Type', archivo.mime);
  res.setHeader('Content-Length', archivo.contenido.length);
  res.setHeader('Content-Disposition', `${disposicion}; filename="${archivo.nombreArchivo}"`);
  res.status(200).send(archivo.contenido);
}
