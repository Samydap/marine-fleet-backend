import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PageQueryDto } from '../../../../shared/application/pagination/page-query.dto';
import { RolCodigo } from '../../../../shared/domain/rbac/rol.enum';
import { EstadoUsuario } from '../../domain/usuario.entity';

export class CrearUsuarioDto {
  @ApiProperty({ example: 'Tashigi' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  nombreCompleto!: string;

  @ApiProperty({ example: 'tashigi@marina.gov' })
  @IsEmail({}, { message: 'El correo no tiene un formato valido.' })
  @MaxLength(150)
  email!: string;

  @ApiProperty({
    example: 'Shigure.2026',
    description: '8+ caracteres, mayuscula, minuscula y numero',
  })
  @IsString()
  @MaxLength(128)
  password!: string;

  @ApiProperty({ enum: RolCodigo })
  @IsEnum(RolCodigo)
  rol!: RolCodigo;

  @ApiPropertyOptional({ example: 'b-loguetown', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  baseNavalId?: string | null;
}

export class ActualizarUsuarioDto {
  @ApiProperty({ example: 1, description: 'Version leida (concurrencia optimista)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  nombreCompleto?: string;

  @ApiPropertyOptional({ enum: RolCodigo })
  @IsOptional()
  @IsEnum(RolCodigo)
  rol?: RolCodigo;

  @ApiPropertyOptional({ nullable: true, description: 'null quita la base (rol global)' })
  @IsOptional()
  @ValidateIf((_o, valor) => valor !== null)
  @IsString()
  @MaxLength(36)
  baseNavalId?: string | null;

  @ApiPropertyOptional({ enum: EstadoUsuario, description: 'ACTIVO tambien desbloquea' })
  @IsOptional()
  @IsEnum(EstadoUsuario)
  estado?: EstadoUsuario;
}

export class RestablecerContrasenaDto {
  @ApiProperty({ example: 'Nueva.Clave2026' })
  @IsString()
  @MaxLength(128)
  nuevaPassword!: string;
}

export class CambiarMiContrasenaDto extends RestablecerContrasenaDto {
  @ApiProperty({ example: 'Marina.2026' })
  @IsString()
  @MaxLength(128)
  passwordActual!: string;
}

export class FiltrarUsuariosDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: RolCodigo })
  @IsOptional()
  @IsEnum(RolCodigo)
  rol?: RolCodigo;

  @ApiPropertyOptional({ example: 'b-loguetown' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  baseNavalId?: string;

  @ApiPropertyOptional({ enum: EstadoUsuario })
  @IsOptional()
  @IsEnum(EstadoUsuario)
  estado?: EstadoUsuario;
}
