import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { FormatoCartel } from '../../domain/cartel-renderer.port';

export class DescargarCartelDto {
  @ApiPropertyOptional({
    enum: ['pdf', 'svg'],
    default: 'pdf',
    description: 'svg = formato imagen',
  })
  @IsOptional()
  @IsIn(['pdf', 'svg'])
  formato: FormatoCartel = 'pdf';
}
