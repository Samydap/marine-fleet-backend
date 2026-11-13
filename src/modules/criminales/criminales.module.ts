import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActualizarCriminalUseCase } from './application/actualizar-criminal.use-case';
import { ActualizarOrganizacionUseCase } from './application/actualizar-organizacion.use-case';
import { AfiliarAOrganizacionUseCase } from './application/afiliar-a-organizacion.use-case';
import { AplicarDesenlaceIncidenteUseCase } from './application/aplicar-desenlace-incidente.use-case';
import { AplicarRecompensaVigenteUseCase } from './application/aplicar-recompensa-vigente.use-case';
import { BuscarCriminalesUseCase } from './application/buscar-criminales.use-case';
import { CambiarEstadoCriminalUseCase } from './application/cambiar-estado-criminal.use-case';
import { CambiarFotoCriminalUseCase } from './application/cambiar-foto-criminal.use-case';
import { ConsultarHistorialCriminalUseCase } from './application/consultar-historial-criminal.use-case';
import { ConsultarOrganizacionesUseCase } from './application/consultar-organizaciones.use-case';
import { CrearOrganizacionUseCase } from './application/crear-organizacion.use-case';
import { DesafiliarDeOrganizacionUseCase } from './application/desafiliar-de-organizacion.use-case';
import { GestionarAntecedentesUseCase } from './application/gestionar-antecedentes.use-case';
import { ObtenerCriminalUseCase } from './application/obtener-criminal.use-case';
import { RegistrarCriminalUseCase } from './application/registrar-criminal.use-case';
import { Antecedente } from './domain/antecedente.entity';
import { ANTECEDENTE_REPOSITORY } from './domain/antecedente.repository.port';
import { Criminal } from './domain/criminal.entity';
import {
  CRIMINAL_NIVEL_WRITER,
  CRIMINAL_READER,
  CRIMINAL_REPOSITORY,
} from './domain/criminal.repository.port';
import { HISTORIAL_CRIMINAL_REPOSITORY } from './domain/historial.repository.port';
import { Membresia } from './domain/membresia.entity';
import { MEMBRESIA_REPOSITORY } from './domain/membresia.repository.port';
import { Organizacion } from './domain/organizacion.entity';
import { ORGANIZACION_REPOSITORY } from './domain/organizacion.repository.port';
import { CriminalesListener } from './infrastructure/listeners/criminales.listener';
import { TypeOrmAntecedenteRepository } from './infrastructure/typeorm-antecedente.repository';
import { TypeOrmCriminalRepository } from './infrastructure/typeorm-criminal.repository';
import { TypeOrmHistorialRepository } from './infrastructure/typeorm-historial.repository';
import { TypeOrmMembresiaRepository } from './infrastructure/typeorm-membresia.repository';
import { TypeOrmOrganizacionRepository } from './infrastructure/typeorm-organizacion.repository';
import { CriminalesController } from './presentation/criminales.controller';
import { ExpedienteController } from './presentation/expediente.controller';
import { OrganizacionesController } from './presentation/organizaciones.controller';

/**
 * MODULO DE REFERENCIA (RF-1). Dueño: Dev 2.
 *
 * El binding puerto -> adaptador se declara aqui: es el punto donde se cierra la
 * inversion de dependencias. Los casos de uso piden `CRIMINAL_REPOSITORY` y
 * reciben la implementacion de TypeORM sin conocerla.
 *
 * Se EXPORTAN dos puertos y nada mas:
 *  - CRIMINAL_READER: la unica puerta por la que otros modulos (Carteles,
 *    Operativos, Incidentes, Inteligencia, Amenaza, Reportes) leen criminales.
 *  - CRIMINAL_NIVEL_WRITER: la unica escritura ajena permitida, solo del nivel
 *    de amenaza, para el modulo Amenaza (RF-5).
 * El repositorio de escritura completo NO se exporta.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Criminal, Organizacion, Membresia, Antecedente])],
  controllers: [CriminalesController, ExpedienteController, OrganizacionesController],
  providers: [
    TypeOrmCriminalRepository,
    { provide: CRIMINAL_REPOSITORY, useExisting: TypeOrmCriminalRepository },
    { provide: CRIMINAL_READER, useExisting: TypeOrmCriminalRepository },
    { provide: CRIMINAL_NIVEL_WRITER, useExisting: TypeOrmCriminalRepository },
    { provide: ORGANIZACION_REPOSITORY, useClass: TypeOrmOrganizacionRepository },
    { provide: MEMBRESIA_REPOSITORY, useClass: TypeOrmMembresiaRepository },
    { provide: ANTECEDENTE_REPOSITORY, useClass: TypeOrmAntecedenteRepository },
    { provide: HISTORIAL_CRIMINAL_REPOSITORY, useClass: TypeOrmHistorialRepository },

    RegistrarCriminalUseCase,
    BuscarCriminalesUseCase,
    ObtenerCriminalUseCase,
    ActualizarCriminalUseCase,
    CambiarFotoCriminalUseCase,
    CambiarEstadoCriminalUseCase,
    AfiliarAOrganizacionUseCase,
    DesafiliarDeOrganizacionUseCase,
    CrearOrganizacionUseCase,
    ActualizarOrganizacionUseCase,
    ConsultarOrganizacionesUseCase,
    GestionarAntecedentesUseCase,
    ConsultarHistorialCriminalUseCase,
    AplicarRecompensaVigenteUseCase,
    AplicarDesenlaceIncidenteUseCase,

    CriminalesListener,
  ],
  exports: [CRIMINAL_READER, CRIMINAL_NIVEL_WRITER],
})
export class CriminalesModule {}
