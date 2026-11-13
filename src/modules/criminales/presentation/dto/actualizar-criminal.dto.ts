import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * RF-1 modificar datos personales. Todos los campos son opcionales: solo se
 * cambia lo que se envia. Enviar `null` en un campo opcional lo deja vacio.
 */
export class ActualizarCriminalDto {
  @ApiProperty({
    example: 1,
    description: 'Version leida del registro (concurrencia optimista). Si cambio: 409.',
  })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ example: 'Monkey D. Luffy', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre?: string;

  @ApiPropertyOptional({ example: ['Sombrero de Paja', 'Quinto Emperador'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  alias?: string[];

  @ApiPropertyOptional({ example: 19, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  edad?: number | null;

  @ApiPropertyOptional({ example: 'Cicatriz en forma de X en el pecho', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcionFisica?: string | null;

  @ApiPropertyOptional({ example: 'z-wano', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  zonaInfluenciaId?: string | null;
}
