import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { envValidationSchema } from './config/env.validation';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { SharedModule } from './shared/shared.module';

// ---------------------------------------------------------------------------
// Registro de modulos. ORDEN ALFABETICO, UNA LINEA POR MODULO.
//
// Este es el unico archivo compartido por los seis desarrolladores. Las diez
// lineas se declararon el dia 1 del Sprint 1 precisamente para que nadie tenga
// que agregarlas despues: si hay conflicto aqui, se aceptan AMBOS lados.
// ---------------------------------------------------------------------------
import { AmenazaModule } from './modules/amenaza/amenaza.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartelesModule } from './modules/carteles/carteles.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { CriminalesModule } from './modules/criminales/criminales.module';
import { IncidentesModule } from './modules/incidentes/incidentes.module';
import { InteligenciaModule } from './modules/inteligencia/inteligencia.module';
import { OperativosModule } from './modules/operativos/operativos.module';
import { RecompensasModule } from './modules/recompensas/recompensas.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { SincronizacionModule } from './modules/sincronizacion/sincronizacion.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig, jwtConfig],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.getOrThrow<TypeOrmModuleOptions>('database'),
    }),

    // Desacopla modulos: Recompensas publica, Amenaza y Carteles escuchan.
    EventEmitterModule.forRoot({ global: true }),

    SharedModule,

    AmenazaModule,
    AuditoriaModule,
    AuthModule,
    CartelesModule,
    CatalogosModule,
    CriminalesModule,
    IncidentesModule,
    InteligenciaModule,
    OperativosModule,
    RecompensasModule,
    ReportesModule,
    SincronizacionModule,
    UsuariosModule,
  ],
  providers: [
    // Seguro por defecto: todo endpoint exige token y rol salvo @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
