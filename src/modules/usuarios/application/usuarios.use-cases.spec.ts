import { PageResult } from '../../../shared/application/pagination/page-result';
import { ConcurrencyError } from '../../../shared/domain/errors/concurrency.error';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { RolCodigo } from '../../../shared/domain/rbac/rol.enum';
import type { PasswordHasherPort } from '../../auth/domain/password-hasher.port';
import { Rol } from '../domain/rol.entity';
import type { Usuario } from '../domain/usuario.entity';
import { EstadoUsuario } from '../domain/usuario.entity';
import type {
  BaseNavalLookupPort,
  RolRepositoryPort,
  UsuarioRepositoryPort,
} from '../domain/usuario.repository.port';
import { ActualizarUsuarioUseCase } from './actualizar-usuario.use-case';
import { CambiarContrasenaUseCase } from './cambiar-contrasena.use-case';
import { CrearUsuarioUseCase } from './crear-usuario.use-case';

const rol = (codigo: RolCodigo): Rol =>
  Object.assign(new Rol(), {
    id: `r-${codigo}`,
    codigo,
    nombre: codigo,
    permisos: [],
    activo: true,
  });

class UsuariosEnMemoria implements UsuarioRepositoryPort {
  readonly filas = new Map<string, Usuario>();

  buscarPorId(id: string): Promise<Usuario | null> {
    return Promise.resolve(this.filas.get(id) ?? null);
  }
  buscarPorEmailConCredenciales(email: string): Promise<Usuario | null> {
    return Promise.resolve([...this.filas.values()].find((u) => u.email === email) ?? null);
  }
  buscarPorIdConCredenciales(id: string): Promise<Usuario | null> {
    return this.buscarPorId(id);
  }
  listar(): Promise<Usuario[]> {
    return Promise.resolve([...this.filas.values()]);
  }
  buscar(): Promise<PageResult<Usuario>> {
    return Promise.resolve(new PageResult([...this.filas.values()], this.filas.size, 1, 20));
  }
  existeEmail(email: string): Promise<boolean> {
    return Promise.resolve([...this.filas.values()].some((u) => u.email === email));
  }
  guardar(usuario: Usuario): Promise<Usuario> {
    usuario.version = Number(usuario.version ?? 0) + 1;
    this.filas.set(usuario.id, usuario);
    return Promise.resolve(usuario);
  }
}

const roles: RolRepositoryPort = {
  listar: () => Promise.resolve(Object.values(RolCodigo).map(rol)),
  buscarPorCodigo: (codigo) => Promise.resolve(rol(codigo)),
};
const bases: BaseNavalLookupPort = { existeActiva: (id) => Promise.resolve(id === 'b-153') };
const hasher: PasswordHasherPort = {
  hash: (p) => Promise.resolve(`hash:${p}`),
  comparar: (p, h) => Promise.resolve(h === `hash:${p}`),
};

const ADMIN = [Permiso.USUARIOS_ADMINISTRAR];

describe('CrearUsuarioUseCase', () => {
  const nuevo = (repo = new UsuariosEnMemoria()): CrearUsuarioUseCase =>
    new CrearUsuarioUseCase(repo, roles, bases, hasher);

  it('crea la cuenta con el correo normalizado y la contraseña hasheada', async () => {
    const usuario = await nuevo().execute({
      nombreCompleto: ' Tashigi ',
      email: ' Tashigi@Marina.GOV ',
      password: 'Shigure.2026',
      rol: RolCodigo.CAPITAN,
      baseNavalId: 'b-153',
      actorPermisos: ADMIN,
    });

    expect(usuario.email).toBe('tashigi@marina.gov');
    expect(usuario.passwordHash).toBe('hash:Shigure.2026');
    expect(usuario.estado).toBe(EstadoUsuario.ACTIVO);
  });

  it('rechaza un correo repetido', async () => {
    const repo = new UsuariosEnMemoria();
    const datos = {
      nombreCompleto: 'Coby',
      email: 'coby@marina.gov',
      password: 'Coby.2026a',
      rol: RolCodigo.ANALISTA_DATOS_CRIMINALES,
      baseNavalId: null,
      actorPermisos: ADMIN,
    };
    await nuevo(repo).execute(datos);

    await expect(nuevo(repo).execute(datos)).rejects.toMatchObject({ codigo: 'EMAIL_DUPLICADO' });
  });

  it('no deja a un administrador comun crear un Almirante', async () => {
    await expect(
      nuevo().execute({
        nombreCompleto: 'Impostor',
        email: 'x@marina.gov',
        password: 'Impostor.2026',
        rol: RolCodigo.ALMIRANTE,
        baseNavalId: null,
        actorPermisos: ADMIN,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('rechaza una base naval que no existe', async () => {
    await expect(
      nuevo().execute({
        nombreCompleto: 'Helmeppo',
        email: 'h@marina.gov',
        password: 'Helmeppo.2026',
        rol: RolCodigo.CAPITAN,
        baseNavalId: 'b-inexistente',
        actorPermisos: ADMIN,
      }),
    ).rejects.toMatchObject({ codigo: 'BASE_INVALIDA' });
  });
});

describe('ActualizarUsuarioUseCase y CambiarContrasenaUseCase', () => {
  let repo: UsuariosEnMemoria;

  beforeEach(async () => {
    repo = new UsuariosEnMemoria();
    await new CrearUsuarioUseCase(repo, roles, bases, hasher).execute({
      nombreCompleto: 'Coby',
      email: 'coby@marina.gov',
      password: 'Coby.2026a',
      rol: RolCodigo.ANALISTA_DATOS_CRIMINALES,
      baseNavalId: null,
      actorPermisos: ADMIN,
    });
  });

  const coby = (): Usuario => [...repo.filas.values()][0];

  it('desbloquea la cuenta y reinicia los intentos fallidos', async () => {
    Object.assign(coby(), { estado: EstadoUsuario.BLOQUEADO, intentosFallidos: 5 });

    const actualizado = await new ActualizarUsuarioUseCase(repo, roles, bases).execute({
      usuarioId: coby().id,
      version: coby().version,
      estado: EstadoUsuario.ACTIVO,
      actorId: 'u-seguridad',
      actorPermisos: ADMIN,
    });

    expect(actualizado.estado).toBe(EstadoUsuario.ACTIVO);
    expect(actualizado.intentosFallidos).toBe(0);
  });

  it('responde conflicto si la version leida esta desactualizada', async () => {
    await expect(
      new ActualizarUsuarioUseCase(repo, roles, bases).execute({
        usuarioId: coby().id,
        version: 99,
        nombreCompleto: 'Coby',
        actorId: 'u-seguridad',
        actorPermisos: ADMIN,
      }),
    ).rejects.toThrow(ConcurrencyError);
  });

  it('impide cambiarse el rol a uno mismo', async () => {
    await expect(
      new ActualizarUsuarioUseCase(repo, roles, bases).execute({
        usuarioId: coby().id,
        version: coby().version,
        rol: RolCodigo.DIRECTOR_INTELIGENCIA,
        actorId: coby().id,
        actorPermisos: ADMIN,
      }),
    ).rejects.toThrow(DomainError);
  });

  it('cambia la propia contraseña solo con la actual correcta', async () => {
    const useCase = new CambiarContrasenaUseCase(repo, hasher);

    await expect(
      useCase.execute({
        usuarioId: coby().id,
        passwordActual: 'otra',
        nuevaPassword: 'Nueva.2026',
      }),
    ).rejects.toThrow(UnauthorizedError);

    await useCase.execute({
      usuarioId: coby().id,
      passwordActual: 'Coby.2026a',
      nuevaPassword: 'Nueva.2026',
    });
    expect(coby().passwordHash).toBe('hash:Nueva.2026');
  });
});
