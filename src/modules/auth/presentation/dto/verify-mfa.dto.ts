import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyMfaDto {
  @ApiProperty({ description: 'Token temporal devuelto por /auth/login' })
  @IsString()
  @Length(10, 500)
  challengeToken!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El codigo debe tener 6 digitos.' })
  codigo!: string;
}
