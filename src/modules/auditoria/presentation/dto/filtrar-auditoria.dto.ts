import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../../../shared/application/pagination/page-query.dto';

export class FiltrarAuditoriaDto extends PageQueryDto {
  @ApiPropertyOptional({ example: 'u-almirante' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  usuarioId?: string;

  @ApiPropertyOptional({ example: 'VALIDAR_RECOMPENSA' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  accion?: string;

  @ApiPropertyOptional({ example: 'criminal' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  entidad?: string;

  @ApiPropertyOptional({ example: 'c-luffy' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  entidadId?: string;

  @ApiPropertyOptional({ description: 'true = solo exitosas, false = solo fallidas' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  exitoso?: boolean;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  desde?: Date;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  hasta?: Date;
}
