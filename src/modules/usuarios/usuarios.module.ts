import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PASSWORD_HASHER } from '../auth/domain/password-hasher.port';
import { BcryptHasherAdapter } from '../auth/infrastructure/bcrypt-hasher.adapter';
import { ActualizarUsuarioUseCase } from './application/actualizar-usuario.use-case';
import { CambiarContrasenaUseCase } from './application/cambiar-contrasena.use-case';
import { CrearUsuarioUseCase } from './application/crear-usuario.use-case';
import {
  ListarRolesUseCase,
  ListarUsuariosUseCase,
  ObtenerUsuarioUseCase,
} from './application/listar-usuarios.use-case';
import { Rol } from './domain/rol.entity';
import { Usuario } from './domain/usuario.entity';
import {
  BASE_NAVAL_LOOKUP,
  ROL_REPOSITORY,
  USUARIO_REPOSITORY,
} from './domain/usuario.repository.port';
import {
  SqlBaseNavalLookup,
  TypeOrmRolRepository,
  TypeOrmUsuarioRepository,
} from './infrastructure/typeorm-usuario.repository';
import { UsuariosController } from './presentation/usuarios.controller';

/**
 * RF-7 Usuarios y roles. Dueño: Dev 1.
 *
 * Exporta el puerto de usuarios y el hasher: AuthModule los consume para
 * validar credenciales sin conocer TypeORM ni bcrypt. El hasher se declara AQUI
 * (y no en Auth) porque Auth ya importa este modulo: declararlo alla obligaria
 * a importar en los dos sentidos.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Rol])],
  controllers: [UsuariosController],
  providers: [
    { provide: USUARIO_REPOSITORY, useClass: TypeOrmUsuarioRepository },
    { provide: ROL_REPOSITORY, useClass: TypeOrmRolRepository },
    { provide: BASE_NAVAL_LOOKUP, useClass: SqlBaseNavalLookup },
    { provide: PASSWORD_HASHER, useClass: BcryptHasherAdapter },
    CrearUsuarioUseCase,
    ActualizarUsuarioUseCase,
    CambiarContrasenaUseCase,
    ListarUsuariosUseCase,
    ObtenerUsuarioUseCase,
    ListarRolesUseCase,
  ],
  exports: [USUARIO_REPOSITORY, PASSWORD_HASHER],
})
export class UsuariosModule {}
