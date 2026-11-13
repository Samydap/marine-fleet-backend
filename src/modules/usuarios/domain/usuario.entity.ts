import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { Rol } from './rol.entity';

export enum EstadoUsuario {
  ACTIVO = 'ACTIVO',
  BLOQUEADO = 'BLOQUEADO',
  INACTIVO = 'INACTIVO',
}

/** RF-7. Tabla `usuarios` (marines con acceso al sistema). */
@Entity('usuarios')
export class Usuario extends BaseEntity {
  @Column({ name: 'nombre_completo', type: 'varchar', length: 150 })
  nombreCompleto!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  /** Nunca sale en una respuesta: el mapper de presentacion lo excluye. */
  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ name: 'rol_id', type: 'varchar', length: 36 })
  rolId!: string;

  @Column({ name: 'base_naval_id', type: 'varchar', length: 36, nullable: true })
  baseNavalId!: string | null;

  @Column({ type: 'enum', enum: EstadoUsuario, default: EstadoUsuario.ACTIVO })
  estado!: EstadoUsuario;

  @Column({ name: 'mfa_habilitado', type: 'tinyint', width: 1, default: 0 })
  mfaHabilitado!: boolean;

  @Column({ name: 'mfa_secreto_cifrado', type: 'text', nullable: true, select: false })
  mfaSecretoCifrado!: string | null;

  @Column({ name: 'intentos_fallidos', type: 'int', default: 0 })
  intentosFallidos!: number;

  @Column({ name: 'ultimo_acceso', type: 'timestamp', nullable: true })
  ultimoAcceso!: Date | null;

  @ManyToOne(() => Rol, { eager: true })
  @JoinColumn({ name: 'rol_id' })
  rol?: Rol;

  puedeIniciarSesion(): void {
    if (this.estado === EstadoUsuario.BLOQUEADO) {
      throw new DomainError('La cuenta esta bloqueada por intentos fallidos.', 'CUENTA_BLOQUEADA');
    }
    if (this.estado === EstadoUsuario.INACTIVO) {
      throw new DomainError('La cuenta esta inactiva.', 'CUENTA_INACTIVA');
    }
  }

  registrarIntentoFallido(maximo: number): void {
    this.intentosFallidos += 1;
    if (this.intentosFallidos >= maximo) {
      this.estado = EstadoUsuario.BLOQUEADO;
    }
  }

  registrarAccesoExitoso(): void {
    this.intentosFallidos = 0;
    this.ultimoAcceso = new Date();
  }

  /** Activar una cuenta bloqueada tambien reinicia el contador de fallos. */
  cambiarEstado(estado: EstadoUsuario): void {
    if (estado === EstadoUsuario.ACTIVO) {
      this.intentosFallidos = 0;
    }
    this.estado = estado;
  }
}
