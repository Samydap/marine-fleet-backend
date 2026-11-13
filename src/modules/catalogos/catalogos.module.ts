import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogosAdminController } from './catalogos-admin.controller';
import { CatalogosAdminService } from './catalogos-admin.service';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';
import { BaseNaval } from './entities/base-naval.entity';
import { Mar } from './entities/mar.entity';
import { ZonaInfluencia } from './entities/zona-influencia.entity';

/**
 * Catalogos de soporte (mares, zonas de influencia, bases navales).
 * Dueño: Dev 6. Capa delgada deliberada: ver ADR 0001.
 *
 * Lo consumen Operativos (RF-4) y Amenaza (RF-5), por eso exporta el servicio.
 *
 * Lecturas: CatalogosController (cualquier usuario autenticado).
 * Escrituras: CatalogosAdminController (permiso CATALOGOS_ADMINISTRAR).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Mar, ZonaInfluencia, BaseNaval])],
  controllers: [CatalogosController, CatalogosAdminController],
  providers: [CatalogosService, CatalogosAdminService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
