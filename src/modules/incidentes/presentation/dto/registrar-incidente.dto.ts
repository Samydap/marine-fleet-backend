import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  DesenlaceParticipante,
  ResultadoEnfrentamiento,
  RolEnIncidente,
  TipoIncidente,
} from '../../domain/resultado-enfrentamiento.enum';

export class ParticipanteCriminalDto {
  @ApiProperty({ example: 'c-luffy' })
  @IsString()
  @MaxLength(36)
  criminalId!: string;

  @ApiPropertyOptional({ enum: RolEnIncidente, default: RolEnIncidente.OBJETIVO })
  @IsOptional()
  @IsEnum(RolEnIncidente)
  rolEnIncidente?: RolEnIncidente;

  @ApiPropertyOptional({ enum: DesenlaceParticipante, default: DesenlaceParticipante.DESCONOCIDO })
  @IsOptional()
  @IsEnum(DesenlaceParticipante)
  desenlace?: DesenlaceParticipante;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
}

export class MarinoParticipanteDto {
  @ApiProperty({ example: 'Capitan Smoker' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre!: string;

  @ApiPropertyOptional({ example: 'Vicealmirante' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  rango?: string;

  @ApiPropertyOptional({ example: 'u-capitan', description: 'Si el marino es usuario del sistema' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  usuarioId?: string;
}

export class RegistrarIncidenteDto {
  @ApiPropertyOptional({ enum: TipoIncidente, default: TipoIncidente.ENFRENTAMIENTO })
  @IsOptional()
  @IsEnum(TipoIncidente)
  tipo?: TipoIncidente;

  @ApiProperty({ example: '2026-11-10T15:30:00Z' })
  @IsDateString()
  fechaHora!: string;

  @ApiProperty({ example: 'Puerto de Loguetown, muelle 3' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  ubicacion!: string;

  @ApiProperty({ example: 'Intercambio de disparos durante la inspeccion del puerto' })
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  descripcion!: string;

  @ApiPropertyOptional({ example: 'z-loguetown' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  zonaInfluenciaId?: string;

  @ApiPropertyOptional({ example: 'b-loguetown', description: 'Por defecto, la base del usuario' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  baseNavalId?: string;

  @ApiPropertyOptional({ description: 'Operativo del que se origino el enfrentamiento' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  operativoId?: string;

  @ApiPropertyOptional({
    enum: ResultadoEnfrentamiento,
    description: 'Si es distinto de EN_CURSO, el enfrentamiento queda cerrado al registrarse',
  })
  @IsOptional()
  @IsEnum(ResultadoEnfrentamiento)
  resultado?: ResultadoEnfrentamiento;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observaciones?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bajasMarina?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bajasEnemigas?: number;

  @ApiProperty({ type: [ParticipanteCriminalDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ParticipanteCriminalDto)
  criminales!: ParticipanteCriminalDto[];

  @ApiPropertyOptional({ type: [MarinoParticipanteDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => MarinoParticipanteDto)
  marinos?: MarinoParticipanteDto[];
}
