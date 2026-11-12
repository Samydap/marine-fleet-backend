import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { EstadoVerificacion } from '../../domain/avistamiento.entity';

/** Formato de <input type="datetime-local"> o ISO completo. La fecha real la valida el dominio. */
export const FORMATO_FECHA_HORA =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/;

export class AvistamientoDto {
  @ApiProperty({ example: 'c-luffy' })
  @IsString()
  @MaxLength(36)
  criminalId!: string;

  @ApiProperty({
    example: '2026-11-10T14:30',
    description: 'YYYY-MM-DDTHH:mm (hora de Colombia) o ISO',
  })
  @IsString()
  @Matches(FORMATO_FECHA_HORA, { message: 'fechaHora debe tener el formato YYYY-MM-DDTHH:mm.' })
  fechaHora!: string;

  @ApiProperty({ example: 'Puerto de Loguetown' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  ubicacion!: string;

  @ApiPropertyOptional({ example: 'Patrulla de la Base 153' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  testigo?: string;

  @ApiPropertyOptional({ example: 'z-loguetown' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  zonaInfluenciaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
}

export class VerificarAvistamientoDto {
  @ApiProperty({ enum: [EstadoVerificacion.VERIFICADO, EstadoVerificacion.DESCARTADO] })
  @IsIn([EstadoVerificacion.VERIFICADO, EstadoVerificacion.DESCARTADO])
  estado!: EstadoVerificacion.VERIFICADO | EstadoVerificacion.DESCARTADO;
}
