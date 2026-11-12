import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  DesenlaceParticipante,
  ResultadoEnfrentamiento,
} from '../../domain/resultado-enfrentamiento.enum';
import { RegistrarIncidenteDto } from './registrar-incidente.dto';

const VERSION = 'Version leida del registro (concurrencia optimista: 409 si cambio).';

export class DesenlaceDto {
  @ApiProperty({ example: 'c-luffy' })
  @IsString()
  @MaxLength(36)
  criminalId!: string;

  @ApiProperty({ enum: DesenlaceParticipante })
  @IsEnum(DesenlaceParticipante)
  desenlace!: DesenlaceParticipante;
}

export class CerrarIncidenteDto {
  @ApiProperty({ enum: ['EXITO', 'FRACASO', 'PARCIAL'] })
  @IsIn([
    ResultadoEnfrentamiento.EXITO,
    ResultadoEnfrentamiento.FRACASO,
    ResultadoEnfrentamiento.PARCIAL,
  ])
  resultado!: ResultadoEnfrentamiento;

  @ApiProperty({ type: [DesenlaceDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DesenlaceDto)
  desenlaces!: DesenlaceDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observaciones?: string;

  @ApiProperty({ example: 1, description: VERSION })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}

export class VincularOperativoDto {
  @ApiProperty({ example: 'uuid-del-operativo' })
  @IsString()
  @MaxLength(36)
  operativoId!: string;

  @ApiProperty({ example: 1, description: VERSION })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}

/** Correccion: los mismos campos descriptivos del registro, todos opcionales. */
export class CorregirIncidenteDto extends PartialType(
  OmitType(RegistrarIncidenteDto, [
    'criminales',
    'resultado',
    'operativoId',
    'baseNavalId',
  ] as const),
) {
  @ApiProperty({ example: 1, description: VERSION })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}
