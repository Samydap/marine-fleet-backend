import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CriminalesModule } from '../criminales/criminales.module';
import { Incidente } from './domain/incidente.entity';
import { Participante } from './domain/participante.entity';

/**
 * RF-6 Historial de incidentes y enfrentamientos. Dueño: Dev 6.
 *
 * BLOQUEANTE DEL SPRINT 1: requiere `npm run migration:run`
 * (tablas `incidentes` e `incidente_participantes`).
 *
 * PENDIENTE Sprint 1:
 *  - domain/incidente.repository.port.ts
 *  - application/registrar-incidente.use-case.ts
 *  - application/cerrar-incidente.use-case.ts
 *      desenlace CAPTURADO/MUERTO -> emite EVENTOS.INCIDENTE_CERRADO para que
 *      Criminales cambie el estado y Carteles regenere el cartel. Este modulo
 *      NO escribe la tabla criminales: respeta la frontera del otro agregado.
 *  - application/historial-por-criminal.use-case.ts
 *  - infrastructure/typeorm-incidente.repository.ts
 *  - presentation/incidentes.controller.ts
 */
@Module({
  imports: [TypeOrmModule.forFeature([Incidente, Participante]), CriminalesModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class IncidentesModule {}
