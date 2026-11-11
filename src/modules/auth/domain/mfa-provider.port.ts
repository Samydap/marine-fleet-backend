export const MFA_PROVIDER = Symbol('MFA_PROVIDER');

/**
 * Segundo factor. El esquema ya preve `usuarios.mfa_habilitado` y
 * `mfa_secreto_cifrado`, y los roles de Almirante, Director de Inteligencia y
 * Especialista en Seguridad lo exigen por politica.
 */
export interface MfaProviderPort {
  generarSecreto(email: string): Promise<{ secreto: string; urlOtpauth: string }>;
  verificarCodigo(secreto: string, codigo: string): boolean;
}
