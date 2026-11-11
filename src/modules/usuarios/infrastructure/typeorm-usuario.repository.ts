import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../domain/usuario.entity';
import type { UsuarioRepositoryPort } from '../domain/usuario.repository.port';

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
   * accidente en ninguna consulta; este es el unico metodo que lo pide.
   */
  buscarPorEmailConCredenciales(email: string): Promise<Usuario | null> {
    return this.repo
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .leftJoinAndSelect('usuario.rol', 'rol')
      .where('usuario.email = :email', { email })
      .getOne();
  }

  listar(): Promise<Usuario[]> {
    return this.repo.find({ order: { nombreCompleto: 'ASC' } });
  }

  guardar(usuario: Usuario): Promise<Usuario> {
    return this.repo.save(usuario);
  }
}
