import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PageResult } from '../../../shared/application/pagination/page-result';
import type { RolCodigo } from '../../../shared/domain/rbac/rol.enum';
import { Rol } from '../domain/rol.entity';
import { Usuario } from '../domain/usuario.entity';
import type {
  BaseNavalLookupPort,
  FiltroUsuarios,
  RolRepositoryPort,
  UsuarioRepositoryPort,
} from '../domain/usuario.repository.port';

@Injectable()
export class TypeOrmUsuarioRepository implements UsuarioRepositoryPort {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
  ) {}

  buscarPorId(id: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * `password_hash` esta marcado con select: false para que no salga por
   * accidente en ninguna consulta; estos dos metodos son los unicos que lo piden.
   */
  buscarPorEmailConCredenciales(email: string): Promise<Usuario | null> {
    return this.conCredenciales().where('usuario.email = :email', { email }).getOne();
  }

  buscarPorIdConCredenciales(id: string): Promise<Usuario | null> {
    return this.conCredenciales().where('usuario.id = :id', { id }).getOne();
  }

  listar(): Promise<Usuario[]> {
    return this.repo.find({ order: { nombreCompleto: 'ASC' } });
  }

  async buscar(filtro: FiltroUsuarios): Promise<PageResult<Usuario>> {
    const query = this.repo.createQueryBuilder('usuario').leftJoinAndSelect('usuario.rol', 'rol');

    if (filtro.q) {
      query.andWhere('(usuario.nombre_completo LIKE :q OR usuario.email LIKE :q)', {
        q: `%${filtro.q}%`,
      });
    }
    if (filtro.rol) query.andWhere('rol.codigo = :rol', { rol: filtro.rol });
    if (filtro.baseNavalId)
      query.andWhere('usuario.base_naval_id = :base', { base: filtro.baseNavalId });
    if (filtro.estado) query.andWhere('usuario.estado = :estado', { estado: filtro.estado });

    const [data, total] = await query
      .orderBy('usuario.nombreCompleto', filtro.order === 'DESC' ? 'DESC' : 'ASC')
      .skip((filtro.page - 1) * filtro.limit)
      .take(filtro.limit)
      .getManyAndCount();

    return new PageResult(data, total, filtro.page, filtro.limit);
  }

  async existeEmail(email: string): Promise<boolean> {
    return (await this.repo.countBy({ email })) > 0;
  }

  guardar(usuario: Usuario): Promise<Usuario> {
    return this.repo.save(usuario);
  }

  private conCredenciales(): ReturnType<Repository<Usuario>['createQueryBuilder']> {
    return this.repo
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .leftJoinAndSelect('usuario.rol', 'rol');
  }
}

@Injectable()
export class TypeOrmRolRepository implements RolRepositoryPort {
  constructor(@InjectRepository(Rol) private readonly repo: Repository<Rol>) {}

  listar(): Promise<Rol[]> {
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  buscarPorCodigo(codigo: RolCodigo): Promise<Rol | null> {
    return this.repo.findOne({ where: { codigo } });
  }
}

/**
 * Consulta directa a `bases_navales` para no importar el modulo de catalogos
 * (evita un ciclo de modulos). Es lectura de una columna; no merece un puerto ajeno.
 */
@Injectable()
export class SqlBaseNavalLookup implements BaseNavalLookupPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async existeActiva(baseNavalId: string): Promise<boolean> {
    const filas = (await this.dataSource.query(
      `SELECT COUNT(*) AS n FROM bases_navales WHERE id = ? AND estado = 'ACTIVA'`,
      [baseNavalId],
    )) as Array<{ n: number | string }>;
    return Number(filas[0]?.n ?? 0) > 0;
  }
}
