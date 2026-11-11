import type { JwtPayload } from '../../../shared/domain/rbac/authenticated-user';

export const TOKEN_ISSUER = Symbol('TOKEN_ISSUER');

export interface TokensEmitidos {
  readonly accessToken: string;
  readonly refreshToken: string;
}

/** Lo que el caso de uso decide poner en el token; `iat` y `exp` los pone el emisor. */
export type DatosToken = Omit<JwtPayload, 'iat' | 'exp'>;

/**
 * Puerto de emision de tokens. El caso de uso de login depende de esto y no de
 * la libreria JWT, asi que se prueba sin firmar nada de verdad.
 */
export interface TokenIssuerPort {
  emitir(datos: DatosToken): Promise<TokensEmitidos>;
}
