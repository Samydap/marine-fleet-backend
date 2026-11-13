import { ConcurrencyError } from '../../../shared/domain/errors/concurrency.error';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import type { IncidenteCerradoEvent } from '../../../shared/domain/events/eventos.contracts';
import type { AuthenticatedUser } from '../../../shared/domain/rbac/authenticated-user';
import { Permiso, tienePermiso } from '../../../shared/domain/rbac/permiso.enum';
import type { Incidente } from '../domain/incidente.entity';
import type { IncidenteRepositoryPort } from '../domain/incidente.repository.port';

export type UsuarioIncidente = Pick<AuthenticatedUser, 'id' | 'permisos' | 'baseNavalId'>;

/** Base del usuario si esta limitado a ella; null si es rol global. */
export function baseDelUsuario(usuario: UsuarioIncidente): string | null {
  return tienePermiso(usuario.permisos, Permiso.TODO) ? null : usuario.baseNavalId;
}

/** Un marino de base solo registra o modifica enfrentamientos de su propia base. */
export function asegurarBasePropia(usuario: UsuarioIncidente, baseNavalId: string | null): void {
  const propia = baseDelUsuario(usuario);
  if (propia && baseNavalId !== propia) {
    throw new ForbiddenError('registrar o modificar enfrentamientos de otra base naval');
  }
}

export async function cargarIncidente(
  repositorio: IncidenteRepositoryPort,
  id: string,
  usuario: UsuarioIncidente,
  version?: number,
): Promise<Incidente> {
  const incidente = await repositorio.buscarPorId(id);
  if (!incidente) throw new NotFoundError('enfrentamiento', id);
  asegurarBasePropia(usuario, incidente.baseNavalId);
  if (version !== undefined && Number(incidente.version) !== Number(version)) {
    throw new ConcurrencyError('enfrentamiento', id, version);
  }
  return incidente;
}

export function eventoCierre(incidente: Incidente, usuarioId: string): IncidenteCerradoEvent {
  return {
    incidenteId: incidente.id,
    operativoId: incidente.operativoId,
    resultado: incidente.resultado,
    desenlaces: (incidente.participantes ?? []).map((p) => ({
      criminalId: p.criminalId,
      desenlace: p.desenlace,
    })),
    usuarioId,
  };
}
