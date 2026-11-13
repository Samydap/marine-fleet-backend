import { Module } from '@nestjs/common';
import { EstadisticasUseCase } from './application/estadisticas.use-case';
import { ExportarReporteUseCase } from './application/exportar-reporte.use-case';
import {
  HistorialReportesUseCase,
  ReporteRecompensasPorMarUseCase,
} from './application/reporte-recompensas-por-mar.use-case';
import { TendenciasUseCase } from './application/tendencias.use-case';
import { REPORTE_PDF, REPORTES_LECTURA } from './domain/reportes-lectura.port';
import { PdfkitReporteExportador } from './infrastructure/pdfkit-reporte.exportador';
import { TypeOrmReportesLecturaAdapter } from './infrastructure/typeorm-reportes-lectura.adapter';
import { ReportesController } from './presentation/reportes.controller';

/**
 * Analisis y Reportes (reporte mensual por mar, tendencias, estadisticas y
 * exportacion PDF/CSV).
 *
 * Es un MODELO DE LECTURA: consulta las tablas de varios modulos con SQL
 * agregado y no modifica ninguna de ellas. Por eso no importa otros modulos de
 * NestJS: depende de la base, no de sus casos de uso.
 */
@Module({
  controllers: [ReportesController],
  providers: [
    { provide: REPORTES_LECTURA, useClass: TypeOrmReportesLecturaAdapter },
    { provide: REPORTE_PDF, useClass: PdfkitReporteExportador },
    ReporteRecompensasPorMarUseCase,
    HistorialReportesUseCase,
    TendenciasUseCase,
    EstadisticasUseCase,
    ExportarReporteUseCase,
  ],
})
export class ReportesModule {}
