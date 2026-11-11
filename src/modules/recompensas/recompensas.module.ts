import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CriminalesModule } from '../criminales/criminales.module';
import { Recompensa } from './domain/recompensa.entity';

/**
 * RF-1/RF-5 Recompensas. Dueño: Dev 3.
 *
 * Importa CriminalesModule para usar CRIMINAL_READER (solo lectura): asi valida
 * que el criminal exista sin poder modificarlo.
 *
 * PENDIENTE Sprint 1:
 *  - domain/recompensa.repository.port.ts
 *  - application/solicitar-recompensa.use-case.ts
 *      usa requiereValidacionDeAlmirante(monto) de politica-validacion.ts
 *  - application/validar-recompensa.use-case.ts
 *      al pasar a VIGENTE: marcar la anterior HISTORICA, actualizar
 *      criminales.recompensa_vigente_monto y emitir EVENTOS.RECOMPENSA_VIGENTE
 *      (lo escuchan Amenaza para reclasificar y Carteles para regenerar)
 *  - application/historial-recompensas.use-case.ts
 *  - infrastructure/typeorm-recompensa.repository.ts
 *  - presentation/recompensas.controller.ts
 */
@Module({
  imports: [TypeOrmModule.forFeature([Recompensa]), CriminalesModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class RecompensasModule {}
