import { EventSubscriber, type EntitySubscriberInterface, type UpdateEvent } from 'typeorm';
import { ConcurrencyError } from '../../../domain/errors/concurrency.error';

/**
 * CONCURRENCIA OPTIMISTA ATOMICA para toda entidad con columna `version`.
 *
 * El problema: los casos de uso comparan la `version` que envio el cliente con
 * la que leyeron de la base y luego llaman a `save()`. Entre esa lectura y el
 * UPDATE otro usuario puede guardar, y el segundo pisaria al primero en silencio
 * (TOCTOU), porque TypeORM no pone `version` en el WHERE del UPDATE.
 *
 * La solucion: `save()` corre dentro de una transaccion. Antes del UPDATE, este
 * suscriptor bloquea la fila con SELECT ... FOR UPDATE y compara la version real
 * con la que trae la entidad. Si otro usuario guardo en medio, lanza
 * ConcurrencyError (409) y la transaccion se revierte. Dos guardados simultaneos
 * quedan serializados: el primero gana y el segundo recibe 409.
 *
 * Aplica a todas las entidades que extienden BaseEntity (criminales, usuarios,
 * operativos, incidentes, bases navales...), sin tocar cada repositorio.
 */
@EventSubscriber()
export class ConcurrenciaOptimistaSubscriber implements EntitySubscriberInterface {
  async beforeUpdate(event: UpdateEvent<unknown>): Promise<void> {
    const columnaVersion = event.metadata.versionColumn;
    const entidad = event.entity as Record<string, unknown> | undefined;
    if (!columnaVersion || !entidad) return;

    const id = entidad.id;
    const versionLeida = entidad[columnaVersion.propertyName];
    if (typeof id !== 'string' || versionLeida === undefined || versionLeida === null) return;

    const filas = (await event.manager.query(
      `SELECT ${columnaVersion.databaseName} AS version FROM ${event.metadata.tableName} WHERE id = ? FOR UPDATE`,
      [id],
    )) as Array<{ version: number | string }>;

    const versionActual = filas[0]?.version;
    if (versionActual !== undefined && Number(versionActual) !== Number(versionLeida)) {
      throw new ConcurrencyError(event.metadata.tableName, id, Number(versionLeida));
    }
  }
}
