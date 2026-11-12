import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RolParticipacion } from '../../domain/estado-operativo.enum';

export class BaseAsignadaDto {
  @ApiProperty({ example: 'b-g1' })
  @IsString()
  @MaxLength(36)
  baseNavalId!: string;

  @ApiProperty({ enum: RolParticipacion, example: RolParticipacion.APOYO })
  @IsEnum(RolParticipacion)
  rolParticipacion!: RolParticipacion;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unidadesAsignadas?: number;

  @ApiPropertyOptional({ example: '1 buque de guerra' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  recursos?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
}

export class AsignarBasesDto {
  @ApiProperty({ type: [BaseAsignadaDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => BaseAsignadaDto)
  bases!: BaseAsignadaDto[];
}

export class ResponsableDto {
  @ApiProperty({ example: 'u-capitan' })
  @IsString()
  @MaxLength(36)
  usuarioId!: string;

  @ApiPropertyOptional({ example: 'Comandante en el terreno' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  funcion?: string;
}

export class AsignarResponsablesDto {
  @ApiProperty({ type: [ResponsableDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ResponsableDto)
  responsables!: ResponsableDto[];
}
