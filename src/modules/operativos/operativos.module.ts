import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogosModule } from '../catalogos/catalogos.module';
import { CriminalesModule } from '../criminales/criminales.module';
import { Operativo } from './domain/operativo.entity';
import { ParticipacionBase } from './domain/participacion-base.entity';

/**
 * RF-4 Coordinacion de operativos entre bases navales. Dueño: Dev 6.
 *
 * BLOQUEANTE DEL SPRINT 1: correr primero
 *   npm run migration:run
 * Las tablas `operativos` y `operativo_bases` no existen en el esquema original.
 *
 * PENDIENTE Sprint 1:
 *  - domain/politica-asignacion.ts
 *      que base lidera segun la zona de influencia del objetivo
 *  - domain/operativo.repository.port.ts
 *  - application/{crear-operativo,asignar-bases,cambiar-estado-operativo}.use-case.ts
 *  - application/tablero-operativos.use-case.ts
 *  - infrastructure/typeorm-operativo.repository.ts
 *  - presentation/operativos.controller.ts
 *      @RequierePermisos(OPERATIVOS_COORDINAR) + @UseGuards(BaseScopeGuard)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Operativo, ParticipacionBase]),
    CriminalesModule,
    CatalogosModule,
  ],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class OperativosModule {}
