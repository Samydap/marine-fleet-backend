import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { DatosToken, TokenIssuerPort, TokensEmitidos } from '../domain/token-issuer.port';

@Injectable()
export class JwtTokenIssuerAdapter implements TokenIssuerPort {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async emitir(datos: DatosToken): Promise<TokensEmitidos> {
    const [accessToken, refreshToken] = await Promise.all([
      // Secreto y expiracion del access token: los de JwtModule en auth.module.ts.
      this.jwt.signAsync({ ...datos }),

      // El refresh token va con OTRO secreto y solo identifica al usuario: si se
      // filtra, no sirve como access token ni revela permisos.
      this.jwt.signAsync(
        { sub: datos.sub, tipo: 'refresh' },
        {
          secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
          expiresIn: this.config.get<JwtSignOptions['expiresIn']>('jwt.refreshExpiresIn') ?? '7d',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }
}
