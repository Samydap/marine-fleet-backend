import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../../../shared/application/pagination/page-query.dto';
import { EstadoOperativo, PrioridadOperativo } from '../../domain/estado-operativo.enum';

export class FiltrarOperativosDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: EstadoOperativo })
  @IsOptional()
  @IsEnum(EstadoOperativo)
  estado?: EstadoOperativo;

  @ApiPropertyOptional({ enum: PrioridadOperativo })
  @IsOptional()
  @IsEnum(PrioridadOperativo)
  prioridad?: PrioridadOperativo;

  @ApiPropertyOptional({ example: 'b-g5', description: 'Operativos donde participa esta base' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  baseNavalId?: string;

  @ApiPropertyOptional({ example: 'c-luffy' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  criminalId?: string;
}
