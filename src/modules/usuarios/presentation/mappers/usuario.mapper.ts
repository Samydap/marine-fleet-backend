import type { Rol } from '../../domain/rol.entity';
import type { Usuario } from '../../domain/usuario.entity';

export interface UsuarioResponse {
  id: string;
  nombreCompleto: string;
  email: string;
  rol: string | null;
  rolNombre: string | null;
  baseNavalId: string | null;
  estado: string;
  intentosFallidos: number;
  ultimoAcceso: Date | null;
  version: number;
  createdAt: Date;
}

export interface RolResponse {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  permisos: string[];
  requiere2fa: boolean;
  activo: boolean;
}

/** Nunca incluye password_hash ni el secreto MFA. */
export function aUsuarioResponse(usuario: Usuario): UsuarioResponse {
  return {
    id: usuario.id,
    nombreCompleto: usuario.nombreCompleto,
    email: usuario.email,
    rol: usuario.rol?.codigo ?? null,
    rolNombre: usuario.rol?.nombre ?? null,
    baseNavalId: usuario.baseNavalId,
    estado: usuario.estado,
    intentosFallidos: usuario.intentosFallidos,
    ultimoAcceso: usuario.ultimoAcceso,
    version: Number(usuario.version),
    createdAt: usuario.createdAt,
  };
}

export function aRolResponse(rol: Rol): RolResponse {
  return {
    codigo: rol.codigo,
    nombre: rol.nombre,
    descripcion: rol.descripcion,
    permisos: rol.permisos,
    requiere2fa: Boolean(rol.requiere2fa),
    activo: Boolean(rol.activo),
  };
}
