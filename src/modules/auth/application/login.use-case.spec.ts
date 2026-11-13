import type { ConfigService } from '@nestjs/config';
import { PageResult } from '../../../shared/application/pagination/page-result';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { RolCodigo } from '../../../shared/domain/rbac/rol.enum';
import { Rol } from '../../usuarios/domain/rol.entity';
import { EstadoUsuario, Usuario } from '../../usuarios/domain/usuario.entity';
import type { UsuarioRepositoryPort } from '../../usuarios/domain/usuario.repository.port';
import type { PasswordHasherPort } from '../domain/password-hasher.port';
import type { DatosToken, TokenIssuerPort, TokensEmitidos } from '../domain/token-issuer.port';
import { LoginUseCase } from './login.use-case';

const MAX_INTENTOS = 3;
const PASSWORD = 'Marina.2026';

/** Dobles en memoria: el caso de uso depende de puertos, asi que no hay base ni JWT real. */
class UsuariosEnMemoria implements UsuarioRepositoryPort {
  guardados = 0;

  constructor(private readonly usuario: Usuario | null) {}

  buscarPorId(): Promise<Usuario | null> {
    return Promise.resolve(this.usuario);
  }
  buscarPorEmailConCredenciales(email: string): Promise<Usuario | null> {
    return Promise.resolve(this.usuario && this.usuario.email === email ? this.usuario : null);
  }
  buscarPorIdConCredenciales(): Promise<Usuario | null> {
    return Promise.resolve(this.usuario);
  }
  listar(): Promise<Usuario[]> {
    return Promise.resolve(this.usuario ? [this.usuario] : []);
  }
  buscar(): Promise<PageResult<Usuario>> {
    return Promise.resolve(new PageResult(this.usuario ? [this.usuario] : [], 1, 1, 20));
  }
  existeEmail(): Promise<boolean> {
    return Promise.resolve(false);
  }
  guardar(usuario: Usuario): Promise<Usuario> {
    this.guardados += 1;
    return Promise.resolve(usuario);
  }
}

const hasherFalso: PasswordHasherPort = {
  hash: (plano) => Promise.resolve(`hash:${plano}`),
  comparar: (plano, hash) => Promise.resolve(hash === `hash:${plano}`),
};

class EmisorFalso implements TokenIssuerPort {
  ultimo: DatosToken | null = null;

  emitir(datos: DatosToken): Promise<TokensEmitidos> {
    this.ultimo = datos;
    return Promise.resolve({ accessToken: 'access-falso', refreshToken: 'refresh-falso' });
  }

  verificarRefresh(): Promise<string> {
    return Promise.resolve('u-analista');
  }
}

function crearUsuario(cambios: Partial<Usuario> = {}, rolActivo = true): Usuario {
  const rol = Object.assign(new Rol(), {
    id: 'r-analista',
    codigo: RolCodigo.ANALISTA_DATOS_CRIMINALES,
    nombre: 'Analista de Datos Criminales',
    permisos: [Permiso.CRIMINALES_LEER, Permiso.RECOMPENSAS_SOLICITAR],
    activo: rolActivo,
  });

  return Object.assign(new Usuario(), {
    id: 'u-analista',
    nombreCompleto: 'Analista de Datos',
    email: 'analista@marina.gov',
    passwordHash: `hash:${PASSWORD}`,
    rolId: rol.id,
    rol,
    baseNavalId: 'b-16',
    estado: EstadoUsuario.ACTIVO,
    intentosFallidos: 0,
    ultimoAcceso: null,
    ...cambios,
  });
}

function crearCasoDeUso(usuario: Usuario | null): {
  useCase: LoginUseCase;
  repo: UsuariosEnMemoria;
  emisor: EmisorFalso;
} {
  const repo = new UsuariosEnMemoria(usuario);
  const emisor = new EmisorFalso();
  const config = { get: () => MAX_INTENTOS } as unknown as ConfigService;
  return { useCase: new LoginUseCase(repo, hasherFalso, emisor, config), repo, emisor };
}

describe('LoginUseCase', () => {
  it('entrega tokens y el usuario con credenciales correctas', async () => {
    const { useCase } = crearCasoDeUso(crearUsuario());

    const sesion = await useCase.execute({ email: 'analista@marina.gov', password: PASSWORD });

    expect(sesion.accessToken).toBe('access-falso');
    expect(sesion.refreshToken).toBe('refresh-falso');
    expect(sesion.usuario.id).toBe('u-analista');
  });

  it('pone en el token el rol, los permisos y la base naval', async () => {
    const { useCase, emisor } = crearCasoDeUso(crearUsuario());

    await useCase.execute({ email: 'analista@marina.gov', password: PASSWORD });

    expect(emisor.ultimo).toEqual({
      sub: 'u-analista',
      email: 'analista@marina.gov',
      rol: RolCodigo.ANALISTA_DATOS_CRIMINALES,
      permisos: [Permiso.CRIMINALES_LEER, Permiso.RECOMPENSAS_SOLICITAR],
      baseNavalId: 'b-16',
    });
  });

  it('acepta el correo con mayusculas y espacios alrededor', async () => {
    const { useCase } = crearCasoDeUso(crearUsuario());

    const sesion = await useCase.execute({
      email: '  Analista@Marina.GOV ',
      password: PASSWORD,
    });

    expect(sesion.usuario.id).toBe('u-analista');
  });

  it('reinicia el contador de fallos y registra el ultimo acceso al entrar', async () => {
    const usuario = crearUsuario({ intentosFallidos: 2 });
    const { useCase, repo } = crearCasoDeUso(usuario);

    await useCase.execute({ email: usuario.email, password: PASSWORD });

    expect(usuario.intentosFallidos).toBe(0);
    expect(usuario.ultimoAcceso).toBeInstanceOf(Date);
    expect(repo.guardados).toBe(1);
  });

  it('rechaza una contraseña incorrecta y cuenta el intento', async () => {
    const usuario = crearUsuario();
    const { useCase, repo, emisor } = crearCasoDeUso(usuario);

    await expect(useCase.execute({ email: usuario.email, password: 'otra-clave' })).rejects.toThrow(
      UnauthorizedError,
    );

    expect(usuario.intentosFallidos).toBe(1);
    expect(repo.guardados).toBe(1);
    expect(emisor.ultimo).toBeNull();
  });

  it('responde igual si el correo no existe que si la contraseña es incorrecta', async () => {
    const { useCase } = crearCasoDeUso(crearUsuario());

    const correoInexistente = await useCase
      .execute({ email: 'nadie@marina.gov', password: PASSWORD })
      .catch((error: Error) => error);
    const claveIncorrecta = await useCase
      .execute({ email: 'analista@marina.gov', password: 'otra-clave' })
      .catch((error: Error) => error);

    expect(correoInexistente).toBeInstanceOf(UnauthorizedError);
    expect((correoInexistente as Error).message).toBe((claveIncorrecta as Error).message);
  });

  it('bloquea la cuenta al alcanzar el maximo de intentos fallidos', async () => {
    const usuario = crearUsuario();
    const { useCase } = crearCasoDeUso(usuario);

    for (let intento = 0; intento < MAX_INTENTOS; intento += 1) {
      await useCase.execute({ email: usuario.email, password: 'otra-clave' }).catch(() => null);
    }

    expect(usuario.estado).toBe(EstadoUsuario.BLOQUEADO);
  });

  it('una cuenta bloqueada no entra ni con la contraseña correcta', async () => {
    const { useCase, emisor } = crearCasoDeUso(crearUsuario({ estado: EstadoUsuario.BLOQUEADO }));

    const error = await useCase
      .execute({ email: 'analista@marina.gov', password: PASSWORD })
      .catch((e: DomainError) => e);

    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).codigo).toBe('CUENTA_BLOQUEADA');
    expect(emisor.ultimo).toBeNull();
  });

  it('no deja entrar si el rol de la cuenta esta inactivo', async () => {
    const { useCase, emisor } = crearCasoDeUso(crearUsuario({}, false));

    const error = await useCase
      .execute({ email: 'analista@marina.gov', password: PASSWORD })
      .catch((e: DomainError) => e);

    expect((error as DomainError).codigo).toBe('ROL_INACTIVO');
    expect(emisor.ultimo).toBeNull();
  });
});
