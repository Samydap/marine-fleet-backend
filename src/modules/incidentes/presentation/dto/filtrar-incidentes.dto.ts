import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../../../shared/application/pagination/page-query.dto';
import { TipoIncidente } from '../../domain/resultado-enfrentamiento.enum';

export class FiltrarIncidentesDto extends PageQueryDto {
  @ApiPropertyOptional({ example: 'c-luffy' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  criminalId?: string;

  @ApiPropertyOptional({ example: 'b-loguetown' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  baseNavalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(36)
  operativoId?: string;

  @ApiPropertyOptional({ enum: TipoIncidente })
  @IsOptional()
  @IsEnum(TipoIncidente)
  tipo?: TipoIncidente;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  hasta?: string;
}
