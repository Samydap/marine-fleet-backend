import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';
import type { FormatoExportacion } from '../../application/exportar-reporte.use-case';
import type { AgrupacionTendencia } from '../../domain/reportes.types';

export class PeriodoDto {
  @ApiPropertyOptional({
    example: '2026-11',
    description: 'Mes YYYY-MM. Por defecto, el mes en curso',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'periodo debe tener el formato YYYY-MM.' })
  periodo?: string;
}

export class FormatoDto {
  @ApiPropertyOptional({ enum: ['csv', 'pdf'], default: 'pdf' })
  @IsOptional()
  @IsIn(['csv', 'pdf'])
  formato: FormatoExportacion = 'pdf';
}

export class ExportarPeriodoDto extends PeriodoDto {
  @ApiPropertyOptional({ enum: ['csv', 'pdf'], default: 'pdf' })
  @IsOptional()
  @IsIn(['csv', 'pdf'])
  formato: FormatoExportacion = 'pdf';
}

export class TendenciasDto {
  @ApiPropertyOptional({ enum: ['zona', 'afiliacion', 'nivel'], default: 'zona' })
  @IsOptional()
  @IsIn(['zona', 'afiliacion', 'nivel'])
  agrupar: AgrupacionTendencia = 'zona';
}

export class ExportarTendenciasDto extends TendenciasDto {
  @ApiPropertyOptional({ enum: ['csv', 'pdf'], default: 'pdf' })
  @IsOptional()
  @IsIn(['csv', 'pdf'])
  formato: FormatoExportacion = 'pdf';
}
