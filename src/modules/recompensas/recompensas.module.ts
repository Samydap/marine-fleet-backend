import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CriminalesModule } from '../criminales/criminales.module';
import { ActivarRecompensaService } from './application/activar-recompensa.service';
import { ConsultarRecompensasUseCase } from './application/consultar-recompensas.use-case';
import { SolicitarRecompensaUseCase } from './application/solicitar-recompensa.use-case';
import { ValidarRecompensaUseCase } from './application/validar-recompensa.use-case';
import { Recompensa } from './domain/recompensa.entity';
import { RECOMPENSA_REPOSITORY } from './domain/recompensa.repository.port';
import { TypeOrmRecompensaRepository } from './infrastructure/typeorm-recompensa.repository';
import { RecompensasController } from './presentation/recompensas.controller';

/**
 * RF-1/RF-5 Recompensas. Dueño: Dev 3.
 *
 * Importa CriminalesModule solo por CRIMINAL_READER: valida que el criminal
 * exista y este ACTIVO sin poder modificarlo. El monto vigente del criminal lo
 * actualiza Criminales al escuchar RECOMPENSA_VIGENTE.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Recompensa]), CriminalesModule],
  controllers: [RecompensasController],
  providers: [
    { provide: RECOMPENSA_REPOSITORY, useClass: TypeOrmRecompensaRepository },
    ActivarRecompensaService,
    SolicitarRecompensaUseCase,
    ValidarRecompensaUseCase,
    ConsultarRecompensasUseCase,
  ],
  exports: [],
})
export class RecompensasModule {}
