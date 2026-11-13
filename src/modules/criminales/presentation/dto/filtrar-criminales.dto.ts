import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PageQueryDto } from '../../../../shared/application/pagination/page-query.dto';
import {
  CategoriaOrganizacion,
  EstadoCriminal,
  NivelAmenaza,
} from '../../domain/estado-criminal.enum';

export class FiltrarCriminalesDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: EstadoCriminal })
  @IsOptional()
  @IsEnum(EstadoCriminal)
  estado?: EstadoCriminal;

  @ApiPropertyOptional({ enum: NivelAmenaza })
  @IsOptional()
  @IsEnum(NivelAmenaza)
  nivelAmenaza?: NivelAmenaza;

  @ApiPropertyOptional({ example: 'z-sabaody' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  zonaInfluenciaId?: string;

  @ApiPropertyOptional({ example: 'org-sombrero-paja' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  organizacionId?: string;

  @ApiPropertyOptional({
    enum: CategoriaOrganizacion,
    description: 'Tipo de afiliacion vigente: pirata, revolucionario o independiente',
  })
  @IsOptional()
  @IsEnum(CategoriaOrganizacion)
  categoria?: CategoriaOrganizacion;

  @ApiPropertyOptional({ example: 100000000, description: 'Recompensa minima (berries)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  recompensaMin?: number;

  @ApiPropertyOptional({ example: 1000000000, description: 'Recompensa maxima (berries)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  recompensaMax?: number;
}
