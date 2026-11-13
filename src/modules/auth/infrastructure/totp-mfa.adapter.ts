import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { MfaProviderPort } from '../domain/mfa-provider.port';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIODO_SEGUNDOS = 30;
/** Acepta el codigo anterior y el siguiente: tolera ~30 s de desfase de reloj. */
const VENTANA = 1;

function aBase32(bytes: Buffer): string {
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let salida = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) salida += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  return salida;
}

function deBase32(texto: string): Buffer {
  let bits = '';
  for (const letra of texto.replace(/=+$/, '').toUpperCase()) {
    const valor = BASE32.indexOf(letra);
    if (valor < 0) throw new Error('Secreto TOTP con caracteres invalidos');
    bits += valor.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

/** HOTP (RFC 4226) para un contador: HMAC-SHA1 + truncado dinamico a 6 digitos. */
export function codigoHotp(secreto: Buffer, contador: number): string {
  const mensaje = Buffer.alloc(8);
  mensaje.writeBigUInt64BE(BigInt(contador));
  const hmac = createHmac('sha1', secreto).update(mensaje).digest();
  const desplazamiento = hmac[hmac.length - 1] & 0x0f;
  const binario = hmac.readUInt32BE(desplazamiento) & 0x7fffffff;
  return (binario % 1_000_000).toString().padStart(6, '0');
}

/**
 * Implementacion propia de TOTP con `node:crypto` (sin dependencias nuevas):
 * son ~40 lineas y evitan agregar una libreria para algo estandar.
 */
@Injectable()
export class TotpMfaAdapter implements MfaProviderPort {
  private readonly clave: Buffer;

  constructor(config: ConfigService) {
    // MFA_ENCRYPTION_KEY es opcional: sin ella se deriva del secreto JWT.
    const base =
      config.get<string>('MFA_ENCRYPTION_KEY') ?? config.getOrThrow<string>('jwt.secret');
    this.clave = createHash('sha256').update(`mfa:${base}`).digest();
  }

  generarSecreto(email: string): { secreto: string; urlOtpauth: string } {
    const secreto = aBase32(randomBytes(20));
    const etiqueta = encodeURIComponent(`Marina:${email}`);
    return {
      secreto,
      urlOtpauth: `otpauth://totp/${etiqueta}?secret=${secreto}&issuer=Marina&digits=6&period=${PERIODO_SEGUNDOS}`,
    };
  }

  verificarCodigo(secreto: string, codigo: string, ahora: number = Date.now()): boolean {
    if (!/^\d{6}$/.test(codigo)) return false;
    const clave = deBase32(secreto);
    const paso = Math.floor(ahora / 1000 / PERIODO_SEGUNDOS);
    const recibido = Buffer.from(codigo);
    let valido = false;
    for (let d = -VENTANA; d <= VENTANA; d++) {
      // Se comparan todas las ventanas sin cortar antes: tiempo constante.
      valido = timingSafeEqual(Buffer.from(codigoHotp(clave, paso + d)), recibido) || valido;
    }
    return valido;
  }

  cifrar(secreto: string): string {
    const iv = randomBytes(12);
    const cifrador = createCipheriv('aes-256-gcm', this.clave, iv);
    const datos = Buffer.concat([cifrador.update(secreto, 'utf8'), cifrador.final()]);
    return [iv, cifrador.getAuthTag(), datos].map((b) => b.toString('base64')).join('.');
  }

  descifrar(cifrado: string): string {
    const [iv, etiqueta, datos] = cifrado.split('.').map((parte) => Buffer.from(parte, 'base64'));
    const descifrador = createDecipheriv('aes-256-gcm', this.clave, iv);
    descifrador.setAuthTag(etiqueta);
    return Buffer.concat([descifrador.update(datos), descifrador.final()]).toString('utf8');
  }
}
