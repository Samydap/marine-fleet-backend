import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PrioridadOperativo } from '../../domain/estado-operativo.enum';

export class CrearOperativoDto {
  @ApiProperty({ example: 'Captura de Sombrero de Paja en Wano' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  nombre!: string;

  @ApiProperty({ example: 'c-luffy', description: 'Criminal objetivo del operativo' })
  @IsString()
  @MaxLength(36)
  objetivoCriminalId!: string;

  @ApiProperty({ example: '2026-11-20T06:00:00Z', description: 'Fecha de inicio planeada' })
  @IsDateString()
  fechaInicioPlaneada!: string;

  @ApiPropertyOptional({ example: 'Bloquear las rutas de escape por el puerto de Kuri' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  objetivo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  descripcion?: string;

  @ApiPropertyOptional({ enum: PrioridadOperativo, default: PrioridadOperativo.MEDIA })
  @IsOptional()
  @IsEnum(PrioridadOperativo)
  prioridad?: PrioridadOperativo;

  @ApiPropertyOptional({ example: 'z-wano', description: 'Por defecto, la zona del criminal' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  zonaInfluenciaId?: string;

  @ApiPropertyOptional({
    example: 'b-g5',
    description: 'Si se omite, la sugiere la politica de asignacion por zona',
  })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  baseLiderId?: string;

  @ApiPropertyOptional({ example: 12, description: 'Unidades que aporta la base lider' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unidadesLider?: number;

  @ApiPropertyOptional({ example: '2 buques de guerra, 1 unidad de francotiradores' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  recursosLider?: string;
}
