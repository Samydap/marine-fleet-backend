import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RolMembresia } from '../../domain/estado-criminal.enum';

export class AfiliarDto {
  @ApiProperty({ example: 'org-sombrero-paja' })
  @IsString()
  @MaxLength(36)
  organizacionId!: string;

  @ApiProperty({ enum: RolMembresia, example: RolMembresia.MIEMBRO })
  @IsEnum(RolMembresia)
  rol!: RolMembresia;

  @ApiPropertyOptional({ example: '2026-01-15T00:00:00Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fechaIngreso?: Date;
}
