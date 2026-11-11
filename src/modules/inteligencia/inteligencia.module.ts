import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CriminalesModule } from '../criminales/criminales.module';
import { Avistamiento } from './domain/avistamiento.entity';
import { ReporteCiudadano } from './domain/reporte-ciudadano.entity';

/**
 * RF-3 Centro de inteligencia. Dueño: Dev 5.
 *
 * Este es el unico modulo que YA EXISTE en la version 1 del sistema: el CRUD de
 * avistamientos vive hoy en backend/src/server.ts. La migracion no se escribe
 * desde cero:
 *   - `parseFechaHora` de server.ts  ->  DTO con @Matches + @Type(() => Date)
 *   - `validateInput`                ->  class-validator en el DTO
 *   - `criminalExiste`               ->  CRIMINAL_READER.existe()
 *   - consultas parametrizadas       ->  se conservan tal cual en el adaptador
 *
 * PENDIENTE Sprint 1:
 *  - application/registrar-avistamiento.use-case.ts
 *  - application/consultar-avistamientos.use-case.ts
 *  - application/registrar-reporte-ciudadano.use-case.ts  (endpoint @Public)
 *  - application/revisar-reporte.use-case.ts
 *      APROBADO -> crea el avistamiento y emite EVENTOS.REPORTE_APROBADO
 *  - infrastructure/typeorm-avistamiento.repository.ts
 *  - presentation/{avistamientos,reportes}.controller.ts
 */
@Module({
  imports: [TypeOrmModule.forFeature([Avistamiento, ReporteCiudadano]), CriminalesModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class InteligenciaModule {}
