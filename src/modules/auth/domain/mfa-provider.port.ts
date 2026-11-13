export const MFA_PROVIDER = Symbol('MFA_PROVIDER');

/**
 * Segundo factor TOTP (RFC 6238): el codigo de 6 digitos que muestran Google
 * Authenticator, Microsoft Authenticator, Authy...
 *
 * El secreto nunca se guarda en claro: `cifrar` lo protege con AES-256-GCM
 * antes de ir a `usuarios.mfa_secreto_cifrado`.
 */
export interface MfaProviderPort {
  generarSecreto(email: string): { secreto: string; urlOtpauth: string };
  verificarCodigo(secreto: string, codigo: string): boolean;
  cifrar(secreto: string): string;
  descifrar(cifrado: string): string;
}
