# Módulo Sincronización (información entre bases, notificaciones y salud)

**Carpeta:** `src/modules/sincronizacion/` · **Tabla:** `notificaciones`

## El argumento central: ¿qué significa "sincronizar" en un sistema centralizado?

Requerimientos:

- "El sistema debe sincronizar automáticamente la información de un criminal entre todas las bases navales, de modo que cualquier actualización se refleje para todos los usuarios **sin necesidad de registros duplicados**."
- "El sistema debe sincronizar automáticamente avistamientos, operativos y enfrentamientos entre las bases navales."
- RNF: "el estado de un operativo se refleje de forma inmediata (**máximo 15 segundos**) para todos los usuarios de las bases navales asignadas ... dado que el estado se gestiona desde una única fuente centralizada."

Hay **una sola base de datos**. Cuando Loguetown actualiza a Luffy, Marineford no tiene "su copia" que haya que igualar: consulta el mismo registro. Eso resuelve la mitad de **datos** del requisito por diseño: no hay duplicados ni conflictos que reconciliar (y la columna `version` evita que dos bases se pisen).

La otra mitad es que el cambio **se vea sin recargar la página**. Eso es lo que hace este módulo:

```
caso de uso de cualquier módulo
   └─ EventEmitter2.emit(EVENTOS.X, payload)
         └─ EventosSincronizacionListener (escucha TODOS los EVENTOS)
               ├─ CanalSincronizacion.publicar()  → SSE a cada navegador conectado (milisegundos)
               └─ RegistrarNotificacionesUseCase  → fila en `notificaciones` por base afectada
```

Medido contra MariaDB: el evento llega al navegador en menos de 1 segundo, muy por debajo de los 15 s del RNF.

## CU-SI-01 Canal en tiempo real (SSE)

- **Endpoint:** `GET /api/v1/sincronizacion/stream?token=<accessToken>&ultimoId=<n>`
- **Por qué el token va en la URL:** el `EventSource` del navegador no puede enviar el header `Authorization`. El endpoint es `@Public()` frente al guard global, pero verifica el JWT él mismo **antes** de abrir el canal: un token inválido recibe 401.
- **Qué llega:** cada hecho del contrato (`criminal.actualizado`, `operativo.actualizado`, `avistamiento.registrado`, `incidente.cerrado`, ...), y un latido cada 15 s para que proxies no corten la conexión.
- **Filtro por base (`esVisiblePara`):** si el hecho lleva `basesIds` o `baseNavalId`, solo lo reciben esas bases y los roles globales. La información centralizada (un criminal, una recompensa) la reciben todos.
- **Reanudar tras un corte:** `ultimoId` reenvía los cambios posteriores (se guardan los últimos 500 en memoria).
- **Uso en el frontend:**
  ```ts
  const es = new EventSource(`/api/v1/sincronizacion/stream?token=${token}`);
  // Cada hecho llega con su nombre como tipo de evento SSE.
  es.addEventListener('operativo.actualizado', (e) => {
    const cambio = JSON.parse(e.data); // { id, evento, datos, fecha }
    recargarTablero(cambio.datos.operativoId);
  });
  ```
  El `TransformResponseInterceptor` global **no** envuelve los streams `@Sse` (los detecta por su
  metadata), así que `event:` e `id:` llegan tal cual al navegador.

## CU-SI-02 Polling de respaldo

- **Endpoint:** `GET /api/v1/sincronizacion/cambios?despuesDeId=42` o `?desde=2026-11-11T20:00:00Z` (con Bearer token)
- Devuelve `{ ultimoId, cambios[] }` con el mismo filtro por base. Para clientes sin SSE.

## CU-SI-03 Notificaciones a las bases

- **RF:** "notificar a las bases navales asignadas cuando cambie el estado o la prioridad de un operativo."
- **Quién recibe qué** (`politica-notificacion.ts`, función pura):

| Evento                                                                            | Destino                              |
| --------------------------------------------------------------------------------- | ------------------------------------ |
| `operativo.actualizado` (CREADO, ESTADO, PRIORIDAD, BASES, RESPONSABLES, CERRADO) | una fila por cada base en `basesIds` |
| `incidente.registrado`                                                            | la base del enfrentamiento           |
| `reporte.recibido`                                                                | global (`base_naval_id` null)        |
| `recompensa.solicitada` con `requiereValidacion`                                  | global (aviso al Almirante)          |

- **Endpoints:** `GET /api/v1/notificaciones?soloNoLeidas=true&page=&limit=` (las de mi base + las globales; un rol global ve todas) · `PATCH /api/v1/notificaciones/:id/leida` (403 si es de otra base).
- La notificación persiste aunque la base no estuviera conectada: la ve al entrar.
- Un fallo al notificar se registra en el log y **no** tumba el caso de uso que originó el evento.

## CU-SI-04 Salud del sistema

- **RNF:** "disponibilidad mínima del 99 % mensual."
- **Endpoint:** `GET /api/v1/salud` (público) → `{ estado: "OK"|"DEGRADADO", baseDeDatos: { disponible, latenciaMs }, tiempoActivoSegundos }`
- El software no puede garantizar su propia disponibilidad, pero sí exponer un punto que un monitor externo consulte cada minuto para medirla y alertar.

## Límites conocidos

- El canal vive en la memoria de **una** instancia del API. Con varias instancias se cambia el `Subject` por Redis Pub/Sub sin tocar los oyentes.
- `leida` es por notificación (de la base), no por usuario.
