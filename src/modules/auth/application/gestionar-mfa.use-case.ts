import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error';
import type { Usuario } from '../../usuarios/domain/usuario.entity';
import {
  USUARIO_REPOSITORY,
  type UsuarioRepositoryPort,
} from '../../usuarios/domain/usuario.repository.port';
import { MFA_PROVIDER, type MfaProviderPort } from '../domain/mfa-provider.port';

export interface EnrolamientoMfa {
  /** Para escribirlo a mano en la app si no se puede escanear el QR. */
  readonly secreto: string;
  /** Va dentro del codigo QR que escanea la app autenticadora. */
  readonly urlOtpauth: string;
}

/**
 * RF-7. Alta y baja del segundo factor por el propio usuario:
 *  1. enrolar: genera el secreto y lo guarda cifrado, todavia INACTIVO.
 *  2. activar: el usuario demuestra con un codigo que su app quedo bien
 *     configurada; solo entonces el login empieza a pedirlo.
 *  3. desactivar: exige un codigo valido (no basta con robar la sesion).
 */
@Injectable()
export class GestionarMfaUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepositoryPort,
    @Inject(MFA_PROVIDER) private readonly mfa: MfaProviderPort,
  ) {}

  async enrolar(usuarioId: string): Promise<EnrolamientoMfa> {
    const usuario = await this.cargar(usuarioId);
    if (usuario.mfaHabilitado) {
      throw new DomainError('El segundo factor ya esta activo.', 'MFA_YA_ACTIVO');
    }
    const generado = this.mfa.generarSecreto(usuario.email);
    usuario.mfaSecretoCifrado = this.mfa.cifrar(generado.secreto);
    await this.usuarios.guardar(usuario);
    return generado;
  }

  async activar(usuarioId: string, codigo: string): Promise<void> {
    const usuario = await this.cargar(usuarioId);
    if (!usuario.mfaSecretoCifrado) {
      throw new DomainError('Primero genera el codigo QR (enrolar).', 'MFA_NO_ENROLADO');
    }
    this.exigirCodigo(usuario, codigo);
    usuario.mfaHabilitado = true;
    await this.usuarios.guardar(usuario);
  }

  async desactivar(usuarioId: string, codigo: string): Promise<void> {
    const usuario = await this.cargar(usuarioId);
    if (!usuario.mfaHabilitado || !usuario.mfaSecretoCifrado) {
      throw new DomainError('El segundo factor no esta activo.', 'MFA_NO_ACTIVO');
    }
    this.exigirCodigo(usuario, codigo);
    usuario.mfaHabilitado = false;
    usuario.mfaSecretoCifrado = null;
    await this.usuarios.guardar(usuario);
  }

  private exigirCodigo(usuario: Usuario, codigo: string): void {
    const secreto = this.mfa.descifrar(usuario.mfaSecretoCifrado ?? '');
    if (!this.mfa.verificarCodigo(secreto, codigo)) {
      throw new UnauthorizedError('El codigo no es correcto.', 'CODIGO_MFA_INVALIDO');
    }
  }

  private async cargar(usuarioId: string): Promise<Usuario> {
    const usuario = await this.usuarios.buscarPorIdConCredenciales(usuarioId);
    if (!usuario) throw new NotFoundError('usuario', usuarioId);
    return usuario;
  }
}
