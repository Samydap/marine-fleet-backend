import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegistrarAntecedenteDto {
  @ApiProperty({ example: 'Ataque a un Noble Mundial' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  tipoDelito!: string;

  @ApiProperty({ example: 'Golpeo a Saint Charlos en el Archipielago Sabaody' })
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  descripcion!: string;

  @ApiPropertyOptional({ example: '2024-08-15T00:00:00Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fechaHecho?: Date;

  @ApiPropertyOptional({ example: 'Archipielago Sabaody' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ubicacion?: string;
}
