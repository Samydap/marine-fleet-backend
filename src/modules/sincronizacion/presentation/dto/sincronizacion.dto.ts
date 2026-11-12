import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { PageQueryDto } from '../../../../shared/application/pagination/page-query.dto';

export class StreamQueryDto {
  @ApiProperty({
    description: 'Access token (EventSource no puede enviar el header Authorization)',
  })
  @IsString()
  @Length(10, 4000)
  token!: string;

  @ApiPropertyOptional({ description: 'Reenvia los cambios posteriores a este consecutivo' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ultimoId?: number;
}

export class CambiosQueryDto {
  @ApiPropertyOptional({ example: '2026-11-11T20:00:00Z' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ example: 42, description: 'Consecutivo del ultimo cambio recibido' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  despuesDeId?: number;
}

export class NotificacionesQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  soloNoLeidas?: boolean;
}
