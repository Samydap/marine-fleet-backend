import { Inject, Injectable } from '@nestjs/common';
import { aCsv } from '../domain/csv';
import { REPORTE_PDF, type ReportePdfPort } from '../domain/reportes-lectura.port';
import type { TablaReporte } from '../domain/reportes.types';

export type FormatoExportacion = 'csv' | 'pdf';

export interface ArchivoExportado {
  readonly contenido: Buffer;
  readonly mime: string;
  readonly nombreArchivo: string;
}

/** RF "exportar reportes y estadisticas en formatos PDF o CSV". */
@Injectable()
export class ExportarReporteUseCase {
  constructor(@Inject(REPORTE_PDF) private readonly pdf: ReportePdfPort) {}

  async execute(tabla: TablaReporte, formato: FormatoExportacion): Promise<ArchivoExportado> {
    if (formato === 'csv') {
      return {
        contenido: aCsv(tabla),
        mime: 'text/csv; charset=utf-8',
        nombreArchivo: `${tabla.nombreArchivo}.csv`,
      };
    }
    return {
      contenido: await this.pdf.generar(tabla),
      mime: 'application/pdf',
      nombreArchivo: `${tabla.nombreArchivo}.pdf`,
    };
  }
}
