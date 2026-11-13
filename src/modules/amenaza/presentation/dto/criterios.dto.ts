import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { NivelAmenaza } from '../../../../shared/domain/value-objects/nivel-amenaza.enum';

export class CriterioDto {
  @ApiProperty({ enum: [NivelAmenaza.BAJO, NivelAmenaza.MEDIO, NivelAmenaza.ALTO] })
  @IsIn([NivelAmenaza.BAJO, NivelAmenaza.MEDIO, NivelAmenaza.ALTO])
  nivel!: NivelAmenaza;

  @ApiProperty({ example: 1 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoMinimo!: number;

  @ApiProperty({ example: 99999999, nullable: true, description: 'null = sin techo (solo ALTO)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoMaximo!: number | null;
}

export class ActualizarCriteriosDto {
  @ApiProperty({
    type: [CriterioDto],
    example: [
      { nivel: 'BAJO', montoMinimo: 1, montoMaximo: 149999999 },
      { nivel: 'MEDIO', montoMinimo: 150000000, montoMaximo: 999999999 },
      { nivel: 'ALTO', montoMinimo: 1000000000, montoMaximo: null },
    ],
  })
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => CriterioDto)
  criterios!: CriterioDto[];

  @ApiProperty({ example: 'Ajuste tras la Guerra de Marineford' })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  motivo!: string;
}

export class DistribucionQueryDto {
  @ApiPropertyOptional({ type: Boolean, default: true, description: 'Solo criminales ACTIVOS' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  soloActivos = true;
}

export class HistorialAnalisisQueryDto {
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite = 20;
}
