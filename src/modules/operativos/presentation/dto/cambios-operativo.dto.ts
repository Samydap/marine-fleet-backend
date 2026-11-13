import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import {
  EstadoOperativo,
  PrioridadOperativo,
  ResultadoOperativo,
} from '../../domain/estado-operativo.enum';

const VERSION_DESCRIPCION =
  'Version leida del operativo. Si cambio entre tanto, se responde 409 (concurrencia optimista).';

export class CambiarEstadoOperativoDto {
  @ApiProperty({
    enum: [EstadoOperativo.EN_CURSO, EstadoOperativo.ABORTADO],
    description: 'Para completarlo usa POST /operativos/:id/cierre',
  })
  @IsIn([EstadoOperativo.EN_CURSO, EstadoOperativo.ABORTADO, EstadoOperativo.PLANIFICADO])
  estado!: EstadoOperativo;

  @ApiProperty({ example: 1, description: VERSION_DESCRIPCION })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}

export class CambiarPrioridadDto {
  @ApiProperty({ enum: PrioridadOperativo })
  @IsEnum(PrioridadOperativo)
  prioridad!: PrioridadOperativo;

  @ApiProperty({ example: 1, description: VERSION_DESCRIPCION })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}

export class CerrarOperativoDto {
  @ApiProperty({ enum: ResultadoOperativo })
  @IsEnum(ResultadoOperativo)
  resultado!: ResultadoOperativo;

  @ApiPropertyOptional({ example: 'El objetivo escapo hacia el Nuevo Mundo' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observaciones?: string;

  @ApiProperty({ example: 2, description: VERSION_DESCRIPCION })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}
