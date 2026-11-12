import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * La foto viaja en base64 dentro de un JSON. Se eligio sobre multipart para no
 * agregar dependencias (multer y sus tipos) y para que Swagger la pruebe tal
 * cual. 2 MB en binario son ~2.8 MB en base64: de ahi el MaxLength.
 */
export class CambiarFotoDto {
  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'], example: 'image/png' })
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  mime!: string;

  @ApiProperty({
    description:
      'Contenido en base64. Acepta tambien el formato data URL (data:image/png;base64,...)',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(2_900_000)
  imagenBase64!: string;
}
