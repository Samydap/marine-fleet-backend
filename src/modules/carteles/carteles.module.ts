import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CriminalesModule } from '../criminales/criminales.module';
import { Cartel } from './domain/cartel.entity';

/**
 * RF-2 Generacion automatica de carteles. Dueño: Dev 4.
 *
 * Consume CRIMINAL_READER de CriminalesModule: lee criminales sin poder
 * modificarlos. Mientras ese modulo no este listo, el dev stubea el puerto en
 * sus pruebas y avanza igual: ahi esta el valor de la inversion de dependencias.
 *
 * PENDIENTE Sprint 1:
 *  - application/generar-cartel.use-case.ts
 *      arma DatosCartel -> CartelRendererPort -> StoragePort -> persiste version
 *  - application/regenerar-por-cambio.use-case.ts (usa requiereNuevaVersion)
 *  - application/obtener-cartel-vigente.use-case.ts
 *  - infrastructure/pdfkit-renderer.adapter.ts   (implementa CARTEL_RENDERER)
 *  - infrastructure/templates/wanted-poster.template.ts
 *  - infrastructure/listeners/criminal-actualizado.listener.ts
 *      @OnEvent(CRIMINAL_REGISTRADO | CRIMINAL_ESTADO_CAMBIADO | RECOMPENSA_VIGENTE)
 *      Esto es lo que hace que la generacion sea AUTOMATICA y no un boton.
 *  - presentation/carteles.controller.ts
 */
@Module({
  imports: [TypeOrmModule.forFeature([Cartel]), CriminalesModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class CartelesModule {}
