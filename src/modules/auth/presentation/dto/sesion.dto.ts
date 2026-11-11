import { ApiProperty } from '@nestjs/swagger';
import { Permiso } from '../../../../shared/domain/rbac/permiso.enum';
import { RolCodigo } from '../../../../shared/domain/rbac/rol.enum';
import type { Usuario } from '../../../usuarios/domain/usuario.entity';

/** Lo que el frontend guarda como sesion. Nunca incluye el hash ni el secreto MFA. */
export class UsuarioSesionDto {
  @ApiProperty({ example: 'u-almirante' })
  id!: string;

  @ApiProperty({ example: 'almirante@marina.gov' })
  email!: string;

  @ApiProperty({ example: 'Almirante de la Marina' })
  nombreCompleto!: string;

  @ApiProperty({ enum: RolCodigo, example: RolCodigo.ALMIRANTE })
  rol!: RolCodigo;

  @ApiProperty({ enum: Permiso, isArray: true, example: [Permiso.TODO] })
  permisos!: Permiso[];

  @ApiProperty({ nullable: true, example: null, description: 'Null para roles globales' })
  baseNavalId!: string | null;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT de acceso. Va en el header Authorization: Bearer <token>' })
  accessToken!: string;

  @ApiProperty({ description: 'JWT de refresco, firmado con otro secreto' })
  refreshToken!: string;

  @ApiProperty({ type: UsuarioSesionDto })
  usuario!: UsuarioSesionDto;
}

/** La entidad nunca sale tal cual: este mapper decide que ve el cliente. */
export function aUsuarioSesion(usuario: Usuario): UsuarioSesionDto {
  const rol = usuario.rol;
  if (!rol) {
    // Error de programacion, no de negocio: los casos de uso de auth cargan el rol.
    throw new Error('aUsuarioSesion requiere el usuario con su rol cargado.');
  }

  return {
    id: usuario.id,
    email: usuario.email,
    nombreCompleto: usuario.nombreCompleto,
    rol: rol.codigo,
    permisos: rol.permisos,
    baseNavalId: usuario.baseNavalId,
  };
}
