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

export class CodigoMfaDto {
  @ApiProperty({ example: '123456', description: 'Codigo de 6 digitos de la app autenticadora' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El codigo debe tener 6 digitos.' })
  codigo!: string;
}

export class RetoMfaResponseDto {
  @ApiProperty({ example: true })
  mfaRequerido!: true;

  @ApiProperty({
    description: 'Se envia a POST /auth/mfa/verify junto con el codigo (vence en 5 min)',
  })
  challengeToken!: string;

  @ApiProperty({ example: 'almirante@marina.gov' })
  email!: string;
}

export class EnrolamientoMfaResponseDto {
  @ApiProperty({ description: 'Secreto en base32, por si no se puede escanear el QR' })
  secreto!: string;

  @ApiProperty({ example: 'otpauth://totp/Marina:almirante%40marina.gov?secret=...' })
  urlOtpauth!: string;
}
