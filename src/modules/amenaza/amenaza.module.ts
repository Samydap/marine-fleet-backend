import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogosModule } from '../catalogos/catalogos.module';
import { CriminalesModule } from '../criminales/criminales.module';
import { ActualizarCriteriosUseCase } from './application/actualizar-criterios.use-case';
import { ClasificarCriminalUseCase } from './application/clasificar-criminal.use-case';
import { ConsultarAmenazaUseCase } from './application/consultar-amenaza.use-case';
import { ReclasificarMasivoUseCase } from './application/reclasificar-masivo.use-case';
import { AnalisisRiesgo } from './domain/analisis-riesgo.entity';
import { ANALISIS_RIESGO_REPOSITORY } from './domain/analisis-riesgo.repository.port';
import { CONTEXTO_ZONA_PROVIDER } from './domain/contexto-zona.port';
import { CriterioAmenaza } from './domain/criterio-amenaza.entity';
import { CRITERIO_AMENAZA_REPOSITORY } from './domain/criterio-amenaza.repository.port';
import { CatalogosContextoZonaAdapter } from './infrastructure/catalogos-contexto-zona.adapter';
import { AmenazaListener } from './infrastructure/listeners/amenaza.listener';
import { TypeOrmAnalisisRiesgoRepository } from './infrastructure/typeorm-analisis-riesgo.repository';
import { TypeOrmCriterioAmenazaRepository } from './infrastructure/typeorm-criterio-amenaza.repository';
import { AmenazaController } from './presentation/amenaza.controller';

/**
 * RF-5 Analisis y clasificacion de amenaza. Dueño: Dev 3.
 *
 * Amenaza DECIDE el nivel (motor puro en domain/) y Criminales lo PERSISTE a
 * traves de CRIMINAL_NIVEL_WRITER. La zona la aporta Catalogos.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CriterioAmenaza, AnalisisRiesgo]),
    CriminalesModule,
    CatalogosModule,
  ],
  controllers: [AmenazaController],
  providers: [
    { provide: CRITERIO_AMENAZA_REPOSITORY, useClass: TypeOrmCriterioAmenazaRepository },
    { provide: ANALISIS_RIESGO_REPOSITORY, useClass: TypeOrmAnalisisRiesgoRepository },
    { provide: CONTEXTO_ZONA_PROVIDER, useClass: CatalogosContextoZonaAdapter },
    ClasificarCriminalUseCase,
    ReclasificarMasivoUseCase,
    ActualizarCriteriosUseCase,
    ConsultarAmenazaUseCase,
    AmenazaListener,
  ],
  exports: [ClasificarCriminalUseCase],
})
export class AmenazaModule {}
