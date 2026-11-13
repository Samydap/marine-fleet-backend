import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CriminalesModule } from '../criminales/criminales.module';
import { DescargarCartelUseCase } from './application/descargar-cartel.use-case';
import { GenerarCartelUseCase } from './application/generar-cartel.use-case';
import { ListarVersionesCartelUseCase } from './application/listar-versiones-cartel.use-case';
import { ObtenerCartelVigenteUseCase } from './application/obtener-cartel-vigente.use-case';
import { RegenerarPorCambioUseCase } from './application/regenerar-por-cambio.use-case';
import { RegenerarTodosUseCase } from './application/regenerar-todos.use-case';
import { CARTEL_RENDERER } from './domain/cartel-renderer.port';
import { Cartel } from './domain/cartel.entity';
import { CARTEL_REPOSITORY } from './domain/cartel.repository.port';
import { CartelRendererAdapter } from './infrastructure/cartel-renderer.adapter';
import { FotoCartelLoader } from './infrastructure/foto-cartel.loader';
import { CriminalActualizadoListener } from './infrastructure/listeners/criminal-actualizado.listener';
import { PdfkitCartelRenderer } from './infrastructure/pdfkit-cartel.renderer';
import { SvgCartelRenderer } from './infrastructure/svg-cartel.renderer';
import { TypeOrmCartelRepository } from './infrastructure/typeorm-cartel.repository';
import { ArchivosController } from './presentation/archivos.controller';
import { CartelesController } from './presentation/carteles.controller';

/**
 * RF-2 Generacion automatica de carteles. Dueño: Dev 4.
 *
 * Lee criminales solo por CRIMINAL_READER y se entera de los cambios por
 * eventos (CriminalActualizadoListener): no depende de ningun caso de uso ajeno.
 * Tambien expone /archivos, el punto de descarga del almacenamiento.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Cartel]), CriminalesModule],
  controllers: [CartelesController, ArchivosController],
  providers: [
    { provide: CARTEL_REPOSITORY, useClass: TypeOrmCartelRepository },
    { provide: CARTEL_RENDERER, useClass: CartelRendererAdapter },
    FotoCartelLoader,
    PdfkitCartelRenderer,
    SvgCartelRenderer,
    GenerarCartelUseCase,
    RegenerarPorCambioUseCase,
    ObtenerCartelVigenteUseCase,
    ListarVersionesCartelUseCase,
    DescargarCartelUseCase,
    RegenerarTodosUseCase,
    CriminalActualizadoListener,
  ],
  exports: [],
})
export class CartelesModule {}
