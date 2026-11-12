import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../../../shared/application/pagination/page-query.dto';
import { EstadoVerificacion } from '../../domain/avistamiento.entity';

export class FiltrarAvistamientosDto extends PageQueryDto {
  @ApiPropertyOptional({ example: 'c-luffy' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  criminalId?: string;

  @ApiPropertyOptional({ example: 'z-wano' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  zonaInfluenciaId?: string;

  @ApiPropertyOptional({ enum: EstadoVerificacion })
  @IsOptional()
  @IsEnum(EstadoVerificacion)
  estadoVerificacion?: EstadoVerificacion;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Fecha inicial (incluida)' })
  @IsOptional()
  @IsISO8601()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-11-30', description: 'Fecha final (incluida todo el dia)' })
  @IsOptional()
  @IsISO8601()
  hasta?: string;
}

/** `2026-11-30` como "hasta" significa hasta el final de ese dia, no la medianoche. */
export function aRangoDeFechas(dto: FiltrarAvistamientosDto): { desde?: Date; hasta?: Date } {
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/;
  return {
    desde: dto.desde
      ? new Date(soloFecha.test(dto.desde) ? `${dto.desde}T00:00:00-05:00` : dto.desde)
      : undefined,
    hasta: dto.hasta
      ? new Date(soloFecha.test(dto.hasta) ? `${dto.hasta}T23:59:59.999-05:00` : dto.hasta)
      : undefined,
  };
}
