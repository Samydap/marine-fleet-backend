import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);

  app.use(helmet());
  app.use(compression());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.enableCors({
    origin: [config.get<string>('app.frontendUrl') ?? 'http://localhost:4200'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // whitelist + forbidNonWhitelisted: una propiedad no declarada en el DTO es
  // un error, no algo que se ignora en silencio.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new AuditInterceptor(reflector),
    new TransformResponseInterceptor(),
  );

  if (!config.get<boolean>('app.isProduction')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Marine Fleet API')
      .setDescription(
        'Sistema de Gestion de Recompensas y Captura de Criminales de la Marina. ' +
          'Este contrato OpenAPI es la fuente de verdad para el frontend.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'RF-7 Autenticacion y RBAC')
      .addTag('criminales', 'RF-1 Registro y gestion de criminales')
      .addTag('carteles', 'RF-2 Generacion automatica de carteles')
      .addTag('inteligencia', 'RF-3 Avistamientos y reportes')
      .addTag('operativos', 'RF-4 Coordinacion entre bases navales')
      .addTag('amenaza', 'RF-5 Clasificacion de riesgo')
      .addTag('incidentes', 'RF-6 Historial de enfrentamientos')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get<number>('app.port') ?? 3000;
  await app.listen(port);
}

void bootstrap();
