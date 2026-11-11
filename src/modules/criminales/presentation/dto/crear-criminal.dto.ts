import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { RolMembresia } from '../../domain/estado-criminal.enum';

/**
 * DTO DE REFERENCIA. Toda entrada se valida aqui con class-validator; los casos
 * de uso no repiten validaciones de formato. El ValidationPipe global esta en
 * modo whitelist + forbidNonWhitelisted: una propiedad no declarada es un 400.
 */
export class CrearCriminalDto {
  @ApiProperty({ example: 'Monkey D. Luffy', maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre!: string;

  @ApiPropertyOptional({ example: ['Sombrero de Paja', 'Mugiwara'], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  alias?: string[];

  @ApiPropertyOptional({ example: 19, minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  edad?: number;

  @ApiPropertyOptional({ example: 'Complexion delgada, cicatriz en el pecho' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcionFisica?: string;

  @ApiPropertyOptional({ example: 'z-sabaody' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  zonaInfluenciaId?: string;

  @ApiPropertyOptional({ example: 'org-strawhat', description: 'Organizacion a la que se afilia' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  organizacionId?: string;

  @ApiPropertyOptional({ enum: RolMembresia, example: RolMembresia.LIDER })
  @IsOptional()
  @IsEnum(RolMembresia)
  rolEnOrganizacion?: RolMembresia;
}
