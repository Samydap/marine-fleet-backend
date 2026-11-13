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
  /**
   * Verifica un refresh token (firma, expiracion y tipo) y devuelve el id del
   * usuario. Lanza UnauthorizedError si no es valido.
   */
  verificarRefresh(refreshToken: string): Promise<string>;
  /** Token corto (5 min) que prueba que la contraseña ya fue validada. */
  emitirRetoMfa(usuarioId: string): Promise<string>;
  /** Devuelve el id del usuario del reto, o lanza UnauthorizedError. */
  verificarRetoMfa(challengeToken: string): Promise<string>;
}
