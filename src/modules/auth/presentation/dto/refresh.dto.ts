import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, MaxLength } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token devuelto por /auth/login o por un refresh anterior' })
  @IsJWT({ message: 'El refresh token no tiene formato JWT.' })
  @MaxLength(2000)
  refreshToken!: string;
}
