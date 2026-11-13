/**
 * Serializa tareas por clave dentro del proceso: dos generaciones de cartel del
 * MISMO criminal nunca corren a la vez (cada una calcula `numero_version`), pero
 * las de criminales distintos si corren en paralelo.
 *
 * Suficiente para un solo proceso de Node. Con varias instancias se sustituye por
 * un lock en la base (SELECT ... FOR UPDATE) sin tocar los casos de uso.
 */
export class ColaPorClave {
  private readonly colas = new Map<string, Promise<unknown>>();

  ejecutar<T>(clave: string, tarea: () => Promise<T>): Promise<T> {
    const anterior = this.colas.get(clave) ?? Promise.resolve();
    const actual = anterior.catch(() => undefined).then(tarea);
    this.colas.set(clave, actual);
    void actual
      .catch(() => undefined)
      .finally(() => {
        if (this.colas.get(clave) === actual) this.colas.delete(clave);
      });
    return actual;
  }
}
