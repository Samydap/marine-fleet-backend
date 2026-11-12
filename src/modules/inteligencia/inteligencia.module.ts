import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogosModule } from '../catalogos/catalogos.module';
import { CriminalesModule } from '../criminales/criminales.module';
import { ActualizarAvistamientoUseCase } from './application/actualizar-avistamiento.use-case';
import {
  ConsultarAvistamientosUseCase,
  ObtenerAvistamientoUseCase,
} from './application/consultar-avistamientos.use-case';
import { EliminarAvistamientoUseCase } from './application/eliminar-avistamiento.use-case';
import { ListarReportesUseCase } from './application/listar-reportes.use-case';
import { RegistrarAvistamientoUseCase } from './application/registrar-avistamiento.use-case';
import { RegistrarReporteCiudadanoUseCase } from './application/registrar-reporte-ciudadano.use-case';
import { RevisarReporteUseCase } from './application/revisar-reporte.use-case';
import { VerificarAvistamientoUseCase } from './application/verificar-avistamiento.use-case';
import { Avistamiento } from './domain/avistamiento.entity';
import { AVISTAMIENTO_REPOSITORY } from './domain/avistamiento.repository.port';
import { ReporteCiudadano } from './domain/reporte-ciudadano.entity';
import { REPORTE_CIUDADANO_REPOSITORY } from './domain/reporte-ciudadano.repository.port';
import { ZONA_CATALOGO } from './domain/zona-catalogo.port';
import { TypeOrmAvistamientoRepository } from './infrastructure/typeorm-avistamiento.repository';
import { TypeOrmReporteCiudadanoRepository } from './infrastructure/typeorm-reporte-ciudadano.repository';
import { ZonaCatalogoAdapter } from './infrastructure/zona-catalogo.adapter';
import { AvistamientosController } from './presentation/avistamientos.controller';
import { LimiteReportesGuard } from './presentation/guards/limite-reportes.guard';
import { ReportesCiudadanosController } from './presentation/reportes-ciudadanos.controller';

/**
 * RF-3 Centro de Inteligencia. Dueño: Dev 5.
 *
 * Portado de la v1 (backend/src/server.ts):
 *   parseFechaHora   -> domain/fecha-hora.ts (con pruebas)
 *   validateInput    -> DTOs con class-validator
 *   criminalExiste   -> CRIMINAL_READER.obtenerResumen()
 *   SQL parametrizado -> se conserva en los adaptadores TypeORM
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Avistamiento, ReporteCiudadano]),
    CriminalesModule,
    CatalogosModule,
  ],
  controllers: [AvistamientosController, ReportesCiudadanosController],
  providers: [
    { provide: AVISTAMIENTO_REPOSITORY, useClass: TypeOrmAvistamientoRepository },
    { provide: REPORTE_CIUDADANO_REPOSITORY, useClass: TypeOrmReporteCiudadanoRepository },
    { provide: ZONA_CATALOGO, useClass: ZonaCatalogoAdapter },
    RegistrarAvistamientoUseCase,
    ActualizarAvistamientoUseCase,
    EliminarAvistamientoUseCase,
    VerificarAvistamientoUseCase,
    ConsultarAvistamientosUseCase,
    ObtenerAvistamientoUseCase,
    RegistrarReporteCiudadanoUseCase,
    ListarReportesUseCase,
    RevisarReporteUseCase,
    LimiteReportesGuard,
  ],
  exports: [],
})
export class InteligenciaModule {}
