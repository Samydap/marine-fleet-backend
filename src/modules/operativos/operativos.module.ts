import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CriminalesModule } from '../criminales/criminales.module';
import { AsignarBasesUseCase } from './application/asignar-bases.use-case';
import { AsignarResponsablesUseCase } from './application/asignar-responsables.use-case';
import { CambiarEstadoOperativoUseCase } from './application/cambiar-estado-operativo.use-case';
import { CambiarPrioridadOperativoUseCase } from './application/cambiar-prioridad-operativo.use-case';
import { CerrarOperativoUseCase } from './application/cerrar-operativo.use-case';
import { CrearOperativoUseCase } from './application/crear-operativo.use-case';
import { ObtenerOperativoUseCase } from './application/obtener-operativo.use-case';
import { TableroOperativosUseCase } from './application/tablero-operativos.use-case';
import { Operativo } from './domain/operativo.entity';
import {
  OPERATIVO_READER,
  OPERATIVO_REPOSITORY,
  REFERENCIAS_OPERATIVO,
} from './domain/operativo.repository.port';
import { ParticipacionBase } from './domain/participacion-base.entity';
import { ResponsableOperativo } from './domain/responsable-operativo.entity';
import { TypeOrmOperativoRepository } from './infrastructure/typeorm-operativo.repository';
import { TypeOrmReferenciasOperativoAdapter } from './infrastructure/typeorm-referencias-operativo.adapter';
import { OperativosController } from './presentation/operativos.controller';

/**
 * RF-4 Coordinacion de operativos entre bases navales. Dueño: Dev 6.
 *
 * Exporta OPERATIVO_READER (solo lectura): Incidentes lo usa para vincular un
 * enfrentamiento al operativo del que salio, sin poder modificarlo.
 *
 * La visibilidad inmediata para las bases (RNF <= 15 s) no se programa aqui:
 * cada caso de uso publica OPERATIVO_ACTUALIZADO y el modulo Sincronizacion lo
 * empuja por SSE y lo persiste como notificacion de cada base.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Operativo, ParticipacionBase, ResponsableOperativo]),
    CriminalesModule,
  ],
  controllers: [OperativosController],
  providers: [
    TypeOrmOperativoRepository,
    { provide: OPERATIVO_REPOSITORY, useExisting: TypeOrmOperativoRepository },
    { provide: OPERATIVO_READER, useExisting: TypeOrmOperativoRepository },
    { provide: REFERENCIAS_OPERATIVO, useClass: TypeOrmReferenciasOperativoAdapter },
    CrearOperativoUseCase,
    AsignarBasesUseCase,
    AsignarResponsablesUseCase,
    CambiarEstadoOperativoUseCase,
    CambiarPrioridadOperativoUseCase,
    CerrarOperativoUseCase,
    TableroOperativosUseCase,
    ObtenerOperativoUseCase,
  ],
  exports: [OPERATIVO_READER],
})
export class OperativosModule {}
