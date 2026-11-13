import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EstadoRecompensa } from '../../domain/estado-recompensa.enum';

export class SolicitarRecompensaDto {
  @ApiProperty({ example: 'c-nami' })
  @IsString()
  @MaxLength(36)
  criminalId!: string;

  @ApiProperty({
    example: 366000000,
    description: 'Monto en berries. Desde 1.000.000.000 requiere firma del Almirante.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(9_999_999_999_999)
  monto!: number;

  @ApiPropertyOptional({ example: 'Participacion en el incidente de Wano' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  motivo?: string;
}

export class ValidarRecompensaDto {
  @ApiProperty({ example: true, description: 'true = aprobar (pasa a VIGENTE), false = rechazar' })
  @IsBoolean()
  aprobar!: boolean;

  @ApiPropertyOptional({ example: 'Monto desproporcionado frente a los antecedentes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo?: string;
}

export class FiltrarRecompensasDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ example: 'c-luffy' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  criminalId?: string;

  @ApiPropertyOptional({ enum: EstadoRecompensa })
  @IsOptional()
  @IsEnum(EstadoRecompensa)
  estado?: EstadoRecompensa;

  @ApiPropertyOptional({ type: Boolean, description: 'Solo las de alto rango' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  requiereValidacion?: boolean;
}
