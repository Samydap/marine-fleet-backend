import { ValidationPipe, VersioningType, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TransformResponseInterceptor } from '../../common/interceptors/transform-response.interceptor';
import { Permiso } from '../../shared/domain/rbac/permiso.enum';
import { RolCodigo } from '../../shared/domain/rbac/rol.enum';
import { Rol } from '../usuarios/domain/rol.entity';
import { EstadoUsuario, Usuario } from '../usuarios/domain/usuario.entity';
import {
  USUARIO_REPOSITORY,
  type UsuarioRepositoryPort,
} from '../usuarios/domain/usuario.repository.port';
import { LoginUseCase } from './application/login.use-case';
import { ObtenerSesionUseCase } from './application/obtener-sesion.use-case';
import { PASSWORD_HASHER } from './domain/password-hasher.port';
import { TOKEN_ISSUER } from './domain/token-issuer.port';
import { BcryptHasherAdapter } from './infrastructure/bcrypt-hasher.adapter';
import { JwtTokenIssuerAdapter } from './infrastructure/jwt-token-issuer.adapter';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { AuthController } from './presentation/auth.controller';

/**
 * PRUEBA DE INTEGRACION del endpoint: HTTP real, ValidationPipe, guards
 * globales, filtro de excepciones, bcrypt y JWT de verdad. Lo unico sustituido
 * es el repositorio, de modo que corre sin base de datos.
 */
const PASSWORD = 'Marina.2026';
const SECRETO = 'secreto-de-pruebas-con-mas-de-32-caracteres';

const CONFIG: Record<string, unknown> = {
  'jwt.secret': SECRETO,
  'jwt.refreshSecret': `${SECRETO}-refresh`,
  'jwt.refreshExpiresIn': '7d',
  'jwt.maxIntentosFallidos': 3,
  'jwt.bcryptRounds': 4,
};

describe('Auth (integracion del modulo)', () => {
  let app: INestApplication;
  let usuario: Usuario;

  beforeAll(async () => {
    const rol = Object.assign(new Rol(), {
      id: 'r-analista',
      codigo: RolCodigo.ANALISTA_DATOS_CRIMINALES,
      nombre: 'Analista de Datos Criminales',
      permisos: [Permiso.CRIMINALES_LEER],
      activo: true,
    });

    usuario = Object.assign(new Usuario(), {
      id: 'u-analista',
      nombreCompleto: 'Analista de Datos',
      email: 'analista@marina.gov',
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      rolId: rol.id,
      rol,
      baseNavalId: null,
      estado: EstadoUsuario.ACTIVO,
      intentosFallidos: 0,
      ultimoAcceso: null,
    });

    const repositorio: UsuarioRepositoryPort = {
      buscarPorId: (id) => Promise.resolve(id === usuario.id ? usuario : null),
      buscarPorEmailConCredenciales: (email) =>
        Promise.resolve(email === usuario.email ? usuario : null),
      listar: () => Promise.resolve([usuario]),
      guardar: (u) => Promise.resolve(u),
    };

    const modulo = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: SECRETO, signOptions: { expiresIn: '15m' } }),
      ],
      controllers: [AuthController],
      providers: [
        LoginUseCase,
        ObtenerSesionUseCase,
        JwtStrategy,
        { provide: USUARIO_REPOSITORY, useValue: repositorio },
        { provide: PASSWORD_HASHER, useClass: BcryptHasherAdapter },
        { provide: TOKEN_ISSUER, useClass: JwtTokenIssuerAdapter },
        {
          provide: ConfigService,
          useValue: {
            get: (clave: string): unknown => CONFIG[clave],
            getOrThrow: (clave: string): unknown => CONFIG[clave],
          },
        },
        // Los mismos guards globales que app.module.ts: seguro por defecto.
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = modulo.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    usuario.estado = EstadoUsuario.ACTIVO;
    usuario.intentosFallidos = 0;
  });

  const login = (cuerpo: object): request.Test =>
    request(app.getHttpServer()).post('/api/v1/auth/login').send(cuerpo);

  describe('POST /api/v1/auth/login', () => {
    it('es publico y responde 200 con tokens y el usuario', async () => {
      const respuesta = await login({ email: usuario.email, password: PASSWORD }).expect(200);

      expect(respuesta.body.success).toBe(true);
      expect(respuesta.body.data.accessToken.split('.')).toHaveLength(3);
      expect(respuesta.body.data.refreshToken.split('.')).toHaveLength(3);
      expect(respuesta.body.data.usuario).toEqual({
        id: 'u-analista',
        email: 'analista@marina.gov',
        nombreCompleto: 'Analista de Datos',
        rol: RolCodigo.ANALISTA_DATOS_CRIMINALES,
        permisos: [Permiso.CRIMINALES_LEER],
        baseNavalId: null,
      });
    });

    it('nunca devuelve el hash de la contraseña', async () => {
      const respuesta = await login({ email: usuario.email, password: PASSWORD }).expect(200);

      expect(JSON.stringify(respuesta.body)).not.toContain('passwordHash');
      expect(JSON.stringify(respuesta.body)).not.toContain(usuario.passwordHash);
    });

    it('responde 401 con una contraseña incorrecta', async () => {
      const respuesta = await login({ email: usuario.email, password: 'otra-clave' }).expect(401);

      expect(respuesta.body.success).toBe(false);
      expect(respuesta.body.error.codigo).toBe('CREDENCIALES_INVALIDAS');
    });

    it('responde 401 con un correo que no existe', async () => {
      await login({ email: 'nadie@marina.gov', password: PASSWORD }).expect(401);
    });

    it('bloquea la cuenta tras el maximo de intentos y luego responde 400', async () => {
      for (let intento = 0; intento < 3; intento += 1) {
        await login({ email: usuario.email, password: 'otra-clave' }).expect(401);
      }

      const respuesta = await login({ email: usuario.email, password: PASSWORD }).expect(400);
      expect(respuesta.body.error.codigo).toBe('CUENTA_BLOQUEADA');
    });

    it('responde 400 si falta la contraseña', async () => {
      await login({ email: usuario.email }).expect(400);
    });

    it('responde 400 si el correo no tiene formato valido', async () => {
      await login({ email: 'no-es-un-correo', password: PASSWORD }).expect(400);
    });

    it('responde 400 ante propiedades no declaradas en el DTO', async () => {
      await login({ email: usuario.email, password: PASSWORD, rol: 'ALMIRANTE' }).expect(400);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('responde 401 sin token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('responde 401 con un token mal firmado', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer aaa.bbb.ccc')
        .expect(401);
    });

    it('devuelve el usuario con el access token del login', async () => {
      const { body } = await login({ email: usuario.email, password: PASSWORD }).expect(200);

      const respuesta = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .expect(200);

      expect(respuesta.body.data.email).toBe('analista@marina.gov');
      expect(respuesta.body.data.permisos).toEqual([Permiso.CRIMINALES_LEER]);
    });

    it('rechaza el refresh token usado como access token', async () => {
      const { body } = await login({ email: usuario.email, password: PASSWORD }).expect(200);

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${body.data.refreshToken}`)
        .expect(401);
    });
  });
});
