import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Aqui NO se valida la politica de contraseñas (longitud minima, etc.): eso
 * corresponde al alta de usuarios. En el login, una contraseña que no cumple la
 * politica es simplemente una contraseña incorrecta y recibe el mismo 401.
 */
export class LoginDto {
  @ApiProperty({ example: 'almirante@marina.gov' })
  @IsEmail({}, { message: 'El correo no tiene un formato valido.' })
  @MaxLength(150)
  email!: string;

  @ApiProperty({ example: 'Marina.2026' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MaxLength(128)
  password!: string;
}
