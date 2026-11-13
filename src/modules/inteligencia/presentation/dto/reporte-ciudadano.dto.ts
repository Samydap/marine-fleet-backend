import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../../../../shared/application/pagination/page-query.dto';
import { EstadoReporte } from '../../domain/reporte-ciudadano.entity';
import { FORMATO_FECHA_HORA } from './avistamiento.dto';

/** Entrada publica: limites de longitud estrictos porque cualquiera puede enviarla. */
export class CrearReporteCiudadanoDto {
  @ApiProperty({ example: 'c-zoro' })
  @IsString()
  @MaxLength(36)
  criminalId!: string;

  @ApiProperty({ example: 'Lo vi preguntando por el puerto tres veces.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  descripcion!: string;

  @ApiProperty({ example: 'Mercado de Loguetown' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  ubicacion!: string;

  @ApiPropertyOptional({ example: '2026-11-10T11:00' })
  @IsOptional()
  @IsString()
  @Matches(FORMATO_FECHA_HORA, { message: 'fechaHecho debe tener el formato YYYY-MM-DDTHH:mm.' })
  fechaHecho?: string;

  @ApiPropertyOptional({ example: 'z-loguetown' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  zonaInfluenciaId?: string;

  @ApiPropertyOptional({ example: 'Vendedor de frutas' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ example: 'den-den mushi 555-0101' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  contacto?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Si es true no se guarda nombre ni contacto',
  })
  @IsOptional()
  @IsBoolean()
  anonimo = false;
}

export class FiltrarReportesDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: EstadoReporte })
  @IsOptional()
  @IsEnum(EstadoReporte)
  estado?: EstadoReporte;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(36)
  criminalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(36)
  zonaInfluenciaId?: string;
}

export class RevisarReporteDto {
  @ApiProperty({ enum: [EstadoReporte.APROBADO, EstadoReporte.RECHAZADO] })
  @IsIn([EstadoReporte.APROBADO, EstadoReporte.RECHAZADO])
  decision!: EstadoReporte.APROBADO | EstadoReporte.RECHAZADO;

  @ApiPropertyOptional({ description: 'Obligatorio si la decision es RECHAZADO' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivoRechazo?: string;
}
