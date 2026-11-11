import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from './domain/rol.entity';
import { Usuario } from './domain/usuario.entity';
import { USUARIO_REPOSITORY } from './domain/usuario.repository.port';
import { TypeOrmUsuarioRepository } from './infrastructure/typeorm-usuario.repository';

/**
 * RF-7 Usuarios y roles. Dueño: Dev 1.
 *
 * Exporta el puerto de usuarios: AuthModule lo consume para validar
 * credenciales sin conocer TypeORM.
 *
 * PENDIENTE Sprint 1:
 *  - application/{crear-usuario,asignar-rol,listar-usuarios}.use-case.ts
 *  - presentation/usuarios.controller.ts  (@RequierePermisos(USUARIOS_ADMINISTRAR))
 */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Rol])],
  controllers: [],
  providers: [{ provide: USUARIO_REPOSITORY, useClass: TypeOrmUsuarioRepository }],
  exports: [USUARIO_REPOSITORY],
})
export class UsuariosModule {}
