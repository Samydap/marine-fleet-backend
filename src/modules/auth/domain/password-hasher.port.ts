export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasherPort {
  hash(plano: string): Promise<string>;
  comparar(plano: string, hash: string): Promise<boolean>;
}
