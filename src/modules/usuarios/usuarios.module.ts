import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from './domain/rol.entity';
import { Usuario } from './domain/usuario.entity';

/**
 * RF-7 Usuarios y roles. Dueño: Dev 1.
 *
 * PENDIENTE Sprint 1:
 *  - domain/usuario.repository.port.ts  -> ya definido
 *  - infrastructure/typeorm-usuario.repository.ts
 *  - application/{crear-usuario,asignar-rol,listar-usuarios}.use-case.ts
 *  - presentation/usuarios.controller.ts  (@RequierePermisos(USUARIOS_ADMINISTRAR))
 *
 * Debe EXPORTAR el puerto de usuarios para que AuthModule valide credenciales.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Rol])],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class UsuariosModule {}
