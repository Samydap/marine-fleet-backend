import type { ConfigService } from '@nestjs/config';
import { codigoHotp, TotpMfaAdapter } from './totp-mfa.adapter';

const config = {
  get: () => undefined,
  getOrThrow: () => 'secreto-jwt-de-prueba-con-mas-de-32-caracteres',
} as unknown as ConfigService;

describe('TotpMfaAdapter', () => {
  const totp = new TotpMfaAdapter(config);

  it('cumple los vectores de prueba de la RFC 4226', () => {
    // Secreto ASCII "12345678901234567890", contadores 0 y 1 (RFC 4226, Apendice D).
    const secreto = Buffer.from('12345678901234567890');
    expect(codigoHotp(secreto, 0)).toBe('755224');
    expect(codigoHotp(secreto, 1)).toBe('287082');
  });

  it('acepta el codigo actual y el de la ventana vecina, rechaza uno viejo', () => {
    // "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ" es "12345678901234567890" en base32.
    const secreto = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    const t = 59_000; // paso 1 -> 287082 (RFC 6238 con 6 digitos)
    expect(totp.verificarCodigo(secreto, '287082', t)).toBe(true);
    expect(totp.verificarCodigo(secreto, '287082', t + 30_000)).toBe(true);
    expect(totp.verificarCodigo(secreto, '287082', t + 120_000)).toBe(false);
    expect(totp.verificarCodigo(secreto, '12345', t)).toBe(false);
  });

  it('genera un secreto base32 y su url otpauth para el QR', () => {
    const { secreto, urlOtpauth } = totp.generarSecreto('almirante@marina.gov');
    expect(secreto).toMatch(/^[A-Z2-7]{32}$/);
    expect(urlOtpauth).toContain(`secret=${secreto}`);
    expect(urlOtpauth).toContain('issuer=Marina');
  });

  it('cifra el secreto (nunca en claro) y lo recupera', () => {
    const cifrado = totp.cifrar('GEZDGNBVGY3TQOJQ');
    expect(cifrado).not.toContain('GEZDGNBVGY3TQOJQ');
    expect(totp.descifrar(cifrado)).toBe('GEZDGNBVGY3TQOJQ');
    expect(totp.cifrar('GEZDGNBVGY3TQOJQ')).not.toBe(cifrado);
  });
});
