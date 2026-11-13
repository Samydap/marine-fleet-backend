import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PageQueryDto } from '../../../../shared/application/pagination/page-query.dto';
import { CategoriaOrganizacion, TipoAgrupacion } from '../../domain/estado-criminal.enum';

export class CrearOrganizacionDto {
  @ApiProperty({ example: 'Piratas del Pelirrojo' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({ enum: TipoAgrupacion, example: TipoAgrupacion.TRIPULACION })
  @IsEnum(TipoAgrupacion)
  tipoAgrupacion!: TipoAgrupacion;

  @ApiProperty({ enum: CategoriaOrganizacion, example: CategoriaOrganizacion.PIRATA })
  @IsEnum(CategoriaOrganizacion)
  categoria!: CategoriaOrganizacion;

  @ApiPropertyOptional({ example: 'z-wano' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  zonaInfluenciaId?: string;

  @ApiPropertyOptional({ example: 'Tripulacion de uno de los Cuatro Emperadores' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;
}

export class ActualizarOrganizacionDto {
  @ApiPropertyOptional({ example: 'Piratas del Pelirrojo' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ enum: TipoAgrupacion })
  @IsOptional()
  @IsEnum(TipoAgrupacion)
  tipoAgrupacion?: TipoAgrupacion;

  @ApiPropertyOptional({ enum: CategoriaOrganizacion })
  @IsOptional()
  @IsEnum(CategoriaOrganizacion)
  categoria?: CategoriaOrganizacion;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  zonaInfluenciaId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string | null;

  @ApiPropertyOptional({ description: 'false = organizacion disuelta (baja logica)' })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

export class FiltrarOrganizacionesDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: CategoriaOrganizacion })
  @IsOptional()
  @IsEnum(CategoriaOrganizacion)
  categoria?: CategoriaOrganizacion;

  @ApiPropertyOptional({ enum: TipoAgrupacion })
  @IsOptional()
  @IsEnum(TipoAgrupacion)
  tipoAgrupacion?: TipoAgrupacion;

  @ApiPropertyOptional({ example: 'z-alabasta' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  zonaInfluenciaId?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : value,
  )
  @IsBoolean()
  activa?: boolean;
}
