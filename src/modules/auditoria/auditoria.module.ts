import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AUDITORIA_WRITER } from '../../shared/domain/auditoria/auditoria.port';
import { ConsultarAuditoriaUseCase } from './application/consultar-auditoria.use-case';
import { Auditoria } from './domain/auditoria.entity';
import { AUDITORIA_REPOSITORY } from './domain/auditoria.repository.port';
import { TypeOrmAuditoriaRepository } from './infrastructure/typeorm-auditoria.repository';
import { AuditoriaController } from './presentation/auditoria.controller';

/**
 * RF-7 Bitacora de auditoria. Dueño: Dev 1 (Especialista en Seguridad).
 *
 * Es @Global porque AUDITORIA_WRITER lo usa el AuditInterceptor (transversal)
 * y cualquier caso de uso que quiera dejar valor anterior y nuevo de un cambio.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Auditoria])],
  controllers: [AuditoriaController],
  providers: [
    TypeOrmAuditoriaRepository,
    { provide: AUDITORIA_WRITER, useExisting: TypeOrmAuditoriaRepository },
    { provide: AUDITORIA_REPOSITORY, useExisting: TypeOrmAuditoriaRepository },
    ConsultarAuditoriaUseCase,
  ],
  exports: [AUDITORIA_WRITER],
})
export class AuditoriaModule {}
