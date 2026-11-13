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
import { PageResult } from '../../shared/application/pagination/page-result';
import { Permiso } from '../../shared/domain/rbac/permiso.enum';
import { codigoHotp } from './infrastructure/totp-mfa.adapter';

/** Decodifica base32 a texto binario (solo para calcular el codigo en la prueba). */
function base32(texto: string): Uint8Array {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...texto].map((c) => alfabeto.indexOf(c).toString(2).padStart(5, '0')).join('');
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Uint8Array.from(bytes);
}
import { RolCodigo } from '../../shared/domain/rbac/rol.enum';
import { Rol } from '../usuarios/domain/rol.entity';
import { EstadoUsuario, Usuario } from '../usuarios/domain/usuario.entity';
import {
  USUARIO_REPOSITORY,
  type UsuarioRepositoryPort,
} from '../usuarios/domain/usuario.repository.port';
import { LoginUseCase } from './application/login.use-case';
import { ObtenerSesionUseCase } from './application/obtener-sesion.use-case';
import { GestionarMfaUseCase } from './application/gestionar-mfa.use-case';
import { RefreshTokenUseCase } from './application/refresh-token.use-case';
import { VerifyMfaUseCase } from './application/verify-mfa.use-case';
import { MFA_PROVIDER } from './domain/mfa-provider.port';
import { TotpMfaAdapter } from './infrastructure/totp-mfa.adapter';
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
      buscarPorIdConCredenciales: (id) => Promise.resolve(id === usuario.id ? usuario : null),
      listar: () => Promise.resolve([usuario]),
      buscar: () => Promise.resolve(new PageResult([usuario], 1, 1, 20)),
      existeEmail: (email) => Promise.resolve(email === usuario.email),
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
        RefreshTokenUseCase,
        VerifyMfaUseCase,
        GestionarMfaUseCase,
        { provide: MFA_PROVIDER, useClass: TotpMfaAdapter },
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

  describe('POST /api/v1/auth/refresh', () => {
    it('entrega un par nuevo de tokens con un refresh token valido', async () => {
      const { body } = await login({ email: usuario.email, password: PASSWORD }).expect(200);

      const respuesta = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: body.data.refreshToken })
        .expect(200);

      expect(respuesta.body.data.accessToken.split('.')).toHaveLength(3);
      expect(respuesta.body.data.usuario.id).toBe('u-analista');
    });

    it('rechaza usar el access token como refresh token', async () => {
      const { body } = await login({ email: usuario.email, password: PASSWORD }).expect(200);

      const respuesta = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: body.data.accessToken })
        .expect(401);

      expect(respuesta.body.error.codigo).toBe('REFRESH_INVALIDO');
    });

    it('rechaza renovar si la cuenta fue bloqueada despues del login', async () => {
      const { body } = await login({ email: usuario.email, password: PASSWORD }).expect(200);
      usuario.estado = EstadoUsuario.BLOQUEADO;

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: body.data.refreshToken })
        .expect(401);
    });
  });

  describe('segundo factor (MFA)', () => {
    it('enrola, activa y luego exige el codigo en el login', async () => {
      const totp = app.get<TotpMfaAdapter>(MFA_PROVIDER);
      const { body } = await login({ email: usuario.email, password: PASSWORD }).expect(200);
      const bearer = `Bearer ${body.data.accessToken}`;

      const enrolado = await request(app.getHttpServer())
        .post('/api/v1/auth/mfa/enrolar')
        .set('Authorization', bearer)
        .expect(200);
      const secreto: string = enrolado.body.data.secreto;
      const codigo = (): string => {
        const paso = Math.floor(Date.now() / 30_000);
        return codigoHotp(Buffer.from(base32(secreto)), paso);
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/mfa/activar')
        .set('Authorization', bearer)
        .send({ codigo: codigo() })
        .expect(204);
      expect(totp.descifrar(usuario.mfaSecretoCifrado ?? '')).toBe(secreto);

      const conReto = await login({ email: usuario.email, password: PASSWORD }).expect(200);
      expect(conReto.body.data.mfaRequerido).toBe(true);
      expect(conReto.body.data.accessToken).toBeUndefined();
      const challengeToken: string = conReto.body.data.challengeToken;

      // El reto NO sirve como access token.
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${challengeToken}`)
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/auth/mfa/verify')
        .send({ challengeToken, codigo: '000000' === codigo() ? '111111' : '000000' })
        .expect(401);

      const sesion = await request(app.getHttpServer())
        .post('/api/v1/auth/mfa/verify')
        .send({ challengeToken, codigo: codigo() })
        .expect(200);
      expect(sesion.body.data.accessToken.split('.')).toHaveLength(3);

      // El fixture se comparte entre pruebas: se deja como estaba.
      usuario.mfaHabilitado = false;
      usuario.mfaSecretoCifrado = null;
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
