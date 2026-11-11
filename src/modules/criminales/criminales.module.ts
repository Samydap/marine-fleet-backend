import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BuscarCriminalesUseCase } from './application/buscar-criminales.use-case';
import { CambiarEstadoCriminalUseCase } from './application/cambiar-estado-criminal.use-case';
import { ObtenerCriminalUseCase } from './application/obtener-criminal.use-case';
import { RegistrarCriminalUseCase } from './application/registrar-criminal.use-case';
import { Antecedente } from './domain/antecedente.entity';
import { Criminal } from './domain/criminal.entity';
import { CRIMINAL_READER, CRIMINAL_REPOSITORY } from './domain/criminal.repository.port';
import { Membresia } from './domain/membresia.entity';
import { Organizacion } from './domain/organizacion.entity';
import { TypeOrmCriminalRepository } from './infrastructure/typeorm-criminal.repository';
import { CriminalesController } from './presentation/criminales.controller';

/**
 * MODULO DE REFERENCIA (RF-1). Dueño: Dev 2.
 *
 * El binding puerto -> adaptador se declara aqui: es el punto donde se cierra la
 * inversion de dependencias. Los casos de uso piden `CRIMINAL_REPOSITORY` y
 * reciben la implementacion de TypeORM sin conocerla.
 *
 * `CRIMINAL_READER` se EXPORTA: es la unica puerta por la que otros modulos
 * (Carteles, Operativos, Incidentes, Inteligencia) pueden leer criminales.
 * No se exporta el repositorio de escritura: nadie mas modifica este agregado.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Criminal, Organizacion, Membresia, Antecedente])],
  controllers: [CriminalesController],
  providers: [
    { provide: CRIMINAL_REPOSITORY, useClass: TypeOrmCriminalRepository },
    { provide: CRIMINAL_READER, useClass: TypeOrmCriminalRepository },
    RegistrarCriminalUseCase,
    BuscarCriminalesUseCase,
    ObtenerCriminalUseCase,
    CambiarEstadoCriminalUseCase,
  ],
  exports: [CRIMINAL_READER],
})
export class CriminalesModule {}
