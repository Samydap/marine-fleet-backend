import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CanalSincronizacion } from './application/canal-sincronizacion.service';
import {
  ListarNotificacionesUseCase,
  MarcarNotificacionLeidaUseCase,
} from './application/notificaciones.use-cases';
import { ObtenerSaludUseCase } from './application/obtener-salud.use-case';
import { RegistrarNotificacionesUseCase } from './application/registrar-notificaciones.use-case';
import { Notificacion } from './domain/notificacion.entity';
import {
  NOTIFICACION_REPOSITORY,
  SALUD_PORT,
  VERIFICADOR_SESION,
} from './domain/sincronizacion.ports';
import { JwtVerificadorSesionAdapter } from './infrastructure/jwt-verificador-sesion.adapter';
import { EventosSincronizacionListener } from './infrastructure/listeners/eventos-sincronizacion.listener';
import { TypeOrmNotificacionRepository } from './infrastructure/typeorm-notificacion.repository';
import { TypeOrmSaludAdapter } from './infrastructure/typeorm-salud.adapter';
import { NotificacionesController } from './presentation/notificaciones.controller';
import { SaludController } from './presentation/salud.controller';
import { SincronizacionController } from './presentation/sincronizacion.controller';

/**
 * Sincronizacion de informacion entre bases navales.
 *
 * Por que "sincronizar" no significa copiar datos entre bases: el sistema es
 * CENTRALIZADO (una sola base de datos), asi que un criminal actualizado desde
 * Loguetown ya es el mismo registro que consulta Marineford: no hay duplicados
 * que reconciliar. Lo que este modulo resuelve es la otra mitad del requisito,
 * que el cambio se VEA de inmediato sin recargar: SSE + notificaciones.
 *
 * No importa ningun otro modulo de negocio: solo escucha eventos del contrato.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notificacion]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [SincronizacionController, NotificacionesController, SaludController],
  providers: [
    CanalSincronizacion,
    RegistrarNotificacionesUseCase,
    ListarNotificacionesUseCase,
    MarcarNotificacionLeidaUseCase,
    ObtenerSaludUseCase,
    EventosSincronizacionListener,
    { provide: NOTIFICACION_REPOSITORY, useClass: TypeOrmNotificacionRepository },
    { provide: VERIFICADOR_SESION, useClass: JwtVerificadorSesionAdapter },
    { provide: SALUD_PORT, useClass: TypeOrmSaludAdapter },
  ],
})
export class SincronizacionModule {}
