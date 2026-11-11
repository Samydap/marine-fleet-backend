import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../../../shared/application/pagination/page-query.dto';
import { EstadoCriminal, NivelAmenaza } from '../../domain/estado-criminal.enum';

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

  @ApiPropertyOptional({ example: 'org-strawhat' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  organizacionId?: string;
}
