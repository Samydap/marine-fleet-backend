import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CriminalesModule } from '../criminales/criminales.module';
import { CriterioAmenaza } from './domain/criterio-amenaza.entity';

/**
 * RF-5 Analisis y clasificacion de amenaza. Dueño: Dev 3.
 *
 * El motor (`domain/motor-clasificacion.ts`) ya esta implementado y probado:
 * es una funcion pura, asi que se pudo escribir y verificar sin base de datos.
 *
 * PENDIENTE Sprint 1:
 *  - domain/criterio-amenaza.repository.port.ts
 *  - application/clasificar-criminal.use-case.ts
 *      lee criterios vigentes -> clasificarAmenaza() -> persiste nivel
 *  - application/reclasificar-masivo.use-case.ts  (al cambiar los criterios)
 *  - application/actualizar-criterios.use-case.ts (@Roles(ALMIRANTE))
 *  - infrastructure/listeners/recompensa-cambiada.listener.ts
 *      @OnEvent(EVENTOS.RECOMPENSA_VIGENTE) -> reclasifica ese criminal
 *  - presentation/amenaza.controller.ts (dashboard de distribucion de riesgo)
 */
@Module({
  imports: [TypeOrmModule.forFeature([CriterioAmenaza]), CriminalesModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class AmenazaModule {}
