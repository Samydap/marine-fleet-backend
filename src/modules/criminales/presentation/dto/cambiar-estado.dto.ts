import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';
import { EstadoCriminal } from '../../domain/estado-criminal.enum';

export class CambiarEstadoDto {
  @ApiProperty({ enum: EstadoCriminal })
  @IsEnum(EstadoCriminal)
  estado!: EstadoCriminal;

  @ApiProperty({
    example: 1,
    description:
      'Version leida del registro. Si cambio, la peticion se rechaza con 409 ' +
      '(concurrencia optimista).',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}
