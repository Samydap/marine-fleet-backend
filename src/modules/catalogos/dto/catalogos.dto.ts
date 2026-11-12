import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EstadoBase } from '../entities/base-naval.entity';
import { TipoMar } from '../entities/mar.entity';

const ID_LEGIBLE = /^[a-z0-9-]{1,36}$/;
const ID_DESCRIPCION = 'Opcional: id legible (minusculas, numeros y guiones). Si no, UUID.';

export class CrearMarDto {
  @ApiPropertyOptional({ example: 'm-calm-belt', description: ID_DESCRIPCION })
  @IsOptional()
  @Matches(ID_LEGIBLE)
  id?: string;

  @ApiProperty({ example: 'Calm Belt' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({ enum: TipoMar })
  @IsEnum(TipoMar)
  tipo!: TipoMar;
}

export class ActualizarMarDto extends PartialType(OmitType(CrearMarDto, ['id'] as const)) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class CrearZonaDto {
  @ApiPropertyOptional({ example: 'z-skypiea', description: ID_DESCRIPCION })
  @IsOptional()
  @Matches(ID_LEGIBLE)
  id?: string;

  @ApiProperty({ example: 'm-grand-line' })
  @IsString()
  @MaxLength(36)
  marId!: string;

  @ApiProperty({ example: 'Skypiea' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;

  @ApiPropertyOptional({ example: 'Isla del cielo' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;
}

export class ActualizarZonaDto extends PartialType(OmitType(CrearZonaDto, ['id'] as const)) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class CrearBaseNavalDto {
  @ApiPropertyOptional({ example: 'b-g8', description: ID_DESCRIPCION })
  @IsOptional()
  @Matches(ID_LEGIBLE)
  id?: string;

  @ApiProperty({ example: 'Base G-8' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({ example: 'z-sabaody' })
  @IsString()
  @MaxLength(36)
  zonaInfluenciaId!: string;

  @ApiProperty({ example: 'Isla Navarone, Grand Line' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  ubicacion!: string;

  @ApiProperty({ example: 'Vicealmirante Jonathan' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  comandanteNombre!: string;
}

export class ActualizarBaseNavalDto extends PartialType(
  OmitType(CrearBaseNavalDto, ['id'] as const),
) {
  @ApiPropertyOptional({ enum: EstadoBase })
  @IsOptional()
  @IsEnum(EstadoBase)
  estado?: EstadoBase;

  @ApiPropertyOptional({ example: 1, description: 'Version leida (409 si cambio)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}
