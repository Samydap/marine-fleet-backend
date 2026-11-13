import { ConcurrencyError } from '../../../shared/domain/errors/concurrency.error';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import type {
  CambioOperativo,
  OperativoActualizadoEvent,
} from '../../../shared/domain/events/eventos.contracts';
import type { AuthenticatedUser } from '../../../shared/domain/rbac/authenticated-user';
import { Permiso, tienePermiso } from '../../../shared/domain/rbac/permiso.enum';
import type { Operativo } from '../domain/operativo.entity';
import type { OperativoRepositoryPort } from '../domain/operativo.repository.port';

/** Lo que los casos de uso necesitan del usuario para decidir alcance. */
export type UsuarioOperativo = Pick<AuthenticatedUser, 'id' | 'permisos' | 'baseNavalId'>;

/**
 * Alcance por base naval: un usuario con base asignada (Capitan, Coordinador de
 * una base) solo ve y modifica operativos donde su base participa. Los roles
 * globales (base null) y el permiso ALL ven todo. Devuelve null = sin limite.
 */
export function alcanceDe(usuario: UsuarioOperativo): string | null {
  if (tienePermiso(usuario.permisos, Permiso.TODO)) return null;
  return usuario.baseNavalId;
}

export async function cargarOperativo(
  repositorio: OperativoRepositoryPort,
  id: string,
  usuario: UsuarioOperativo,
): Promise<Operativo> {
  const operativo = await repositorio.buscarPorId(id);
  if (!operativo) {
    throw new NotFoundError('operativo', id);
  }
  const alcance = alcanceDe(usuario);
  if (alcance && !operativo.participaBase(alcance)) {
    throw new ForbiddenError('operar sobre un operativo en el que tu base no participa');
  }
  return operativo;
}

/** Concurrencia optimista: el cliente envia la `version` que leyo. */
export function verificarVersion(operativo: Operativo, version: number | undefined): void {
  if (version !== undefined && Number(operativo.version) !== Number(version)) {
    throw new ConcurrencyError('operativo', operativo.id, version);
  }
}

/** Payload del evento: siempre lleva todas las bases involucradas (RNF <= 15 s). */
export function eventoOperativo(
  operativo: Operativo,
  cambio: CambioOperativo,
  usuarioId: string | null,
): OperativoActualizadoEvent {
  return {
    operativoId: operativo.id,
    codigo: operativo.codigo,
    cambio,
    estado: operativo.estado,
    prioridad: operativo.prioridad,
    basesIds: operativo.basesInvolucradas(),
    usuarioId,
  };
}
