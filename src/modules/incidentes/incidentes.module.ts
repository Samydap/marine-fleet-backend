import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CriminalesModule } from '../criminales/criminales.module';
import { OperativosModule } from '../operativos/operativos.module';
import { CerrarIncidenteUseCase } from './application/cerrar-incidente.use-case';
import { CorregirIncidenteUseCase } from './application/corregir-incidente.use-case';
import {
  HistorialIncidentesUseCase,
  ObtenerIncidenteUseCase,
} from './application/historial-incidentes.use-case';
import { RegistrarIncidenteUseCase } from './application/registrar-incidente.use-case';
import { VincularOperativoUseCase } from './application/vincular-operativo.use-case';
import { Incidente } from './domain/incidente.entity';
import { INCIDENTE_REPOSITORY } from './domain/incidente.repository.port';
import { Participante } from './domain/participante.entity';
import { TypeOrmIncidenteRepository } from './infrastructure/typeorm-incidente.repository';
import { IncidentesController } from './presentation/incidentes.controller';

/**
 * RF-6 Historial de incidentes y enfrentamientos. Dueño: Dev 6.
 *
 * Lee criminales por CRIMINAL_READER y operativos por OPERATIVO_READER: ninguno
 * de los dos se modifica desde aqui. El efecto sobre el estado del criminal
 * (capturado/muerto) viaja como evento INCIDENTE_CERRADO.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Incidente, Participante]),
    CriminalesModule,
    OperativosModule,
  ],
  controllers: [IncidentesController],
  providers: [
    { provide: INCIDENTE_REPOSITORY, useClass: TypeOrmIncidenteRepository },
    RegistrarIncidenteUseCase,
    CorregirIncidenteUseCase,
    VincularOperativoUseCase,
    CerrarIncidenteUseCase,
    HistorialIncidentesUseCase,
    ObtenerIncidenteUseCase,
  ],
})
export class IncidentesModule {}
