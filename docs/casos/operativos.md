# Módulo Operativos (RF-4 Coordinación de operativos)

**Carpeta:** `src/modules/operativos/` · **Clases del diagrama:** `Operativo`, `BaseNaval` (participación), `Usuario` (responsable) · **Tablas:** `operativos`, `operativo_bases`, `operativo_responsables`

## Cómo está armado

```
presentation/operativos.controller.ts   ← recibe HTTP, valida con DTOs, llama 1 caso de uso
application/*.use-case.ts               ← orquesta: carga, aplica regla, guarda, publica evento
domain/operativo.entity.ts              ← REGLAS: transiciones de estado, cierre, editable
domain/politica-asignacion.ts           ← REGLA: qué base lidera; código OP-AAAA-NNNN
domain/operativo.repository.port.ts     ← PUERTOS (interfaces)
infrastructure/typeorm-*.ts             ← ADAPTADORES: SQL con TypeORM
```

**Mapeo de estados** (el documento habla de _planeado, en curso, completado, abortado_):

| Requerimiento | Sistema                      | Cómo se llega                    |
| ------------- | ---------------------------- | -------------------------------- |
| planeado      | `PLANIFICADO`                | al crear                         |
| en curso      | `EN_CURSO`                   | `PATCH /estado`                  |
| completado    | `CERRADO` + `resultadoFinal` | `POST /cierre` (exige resultado) |
| abortado      | `ABORTADO`                   | `PATCH /estado`                  |

Transiciones válidas: `PLANIFICADO → EN_CURSO | ABORTADO`, `EN_CURSO → CERRADO | ABORTADO`. `CERRADO` y `ABORTADO` son finales: no admiten más cambios.

**Alcance por base:** un usuario con base asignada (Capitán, Coordinador de una base) solo ve y modifica los operativos donde su base participa. Los roles globales (base `null`) y el Almirante (`ALL`) ven todo. Esta regla se aplica en los casos de uso, no en el frontend.

**Visibilidad inmediata (RNF ≤ 15 s):** cada caso de uso publica `OPERATIVO_ACTUALIZADO` con `basesIds` (base líder + participantes). El módulo Sincronización lo empuja por SSE y crea una notificación para cada base. Ver `sincronizacion.md`.

---

## CU-OP-01 Crear operativo de captura

- **RF:** "El sistema debe permitir crear un operativo de captura contra un criminal específico, indicando fecha de inicio, objetivo y prioridad."
- **Endpoint:** `POST /api/v1/operativos` · permiso `OPERATIVOS_COORDINAR`
- **Flujo:**
  1. `CrearOperativoDto` valida nombre, `objetivoCriminalId`, `fechaInicioPlaneada` (ISO), prioridad.
  2. `CrearOperativoUseCase` lee el criminal por `CRIMINAL_READER` (solo lectura): debe existir y estar `ACTIVO`.
  3. La zona es la enviada o, si no se envía, la zona de influencia del criminal.
  4. La base líder es la enviada; si el usuario tiene base, es **su** base; si no, la elige `sugerirBaseLider()` (primera base activa de la zona del criminal).
  5. Se genera el código `OP-2026-0001` (consecutivo del año) y se guarda en estado `PLANIFICADO`.
  6. La base líder queda como participación `LIDER`.
  7. Se publica `OPERATIVO_ACTUALIZADO` (cambio `CREADO`).
- **Ejemplo:**
  ```json
  {
    "nombre": "Captura de Luffy",
    "objetivoCriminalId": "c-luffy",
    "fechaInicioPlaneada": "2026-11-20T06:00:00Z",
    "prioridad": "ALTA",
    "objetivo": "Bloquear el puerto de Kuri"
  }
  ```
- **Errores:** 404 criminal o zona inexistente · 400 `CRIMINAL_NO_BUSCADO` (capturado/muerto) · 400 `SIN_BASE_LIDER` · 400 `BASE_INACTIVA` · 403 si un usuario de base intenta liderar desde otra.

## CU-OP-02 Asignar bases y recursos navales

- **RF:** "asignar una o varias bases navales a un operativo, para coordinar la participación conjunta" y "asignar responsables y recursos navales".
- **Endpoint:** `POST /api/v1/operativos/:id/bases` · `OPERATIVOS_COORDINAR`
- **Flujo:** carga el operativo (con alcance) → debe ser editable → cada base debe existir y estar `ACTIVA` → si la base ya participa se actualiza (rol, unidades, recursos), si no se agrega → evento `BASES`.
- **Reglas:** el rol `LIDER` está reservado a la base líder; una base no puede repetirse en la misma petición.
- **Ejemplo:** `{ "bases": [{ "baseNavalId": "b-loguetown", "rolParticipacion": "BLOQUEO", "unidadesAsignadas": 4, "recursos": "2 buques" }] }`

## CU-OP-03 Asignar responsables

- **Endpoint:** `POST /api/v1/operativos/:id/responsables` · `OPERATIVOS_COORDINAR`
- **Flujo:** valida que cada `usuarioId` sea un usuario `ACTIVO` (puerto `REFERENCIAS_OPERATIVO`) → crea o actualiza su función → evento `RESPONSABLES`.
- **Ejemplo:** `{ "responsables": [{ "usuarioId": "u-capitan", "funcion": "Comandante en terreno" }] }`

## CU-OP-04 Actualizar estado

- **RF:** "actualizar el estado de un operativo (planeado, en curso, completado, abortado) y que dicho estado sea visible para todas las bases asignadas".
- **Endpoint:** `PATCH /api/v1/operativos/:id/estado` · `OPERATIVOS_COORDINAR` · body `{ "estado": "EN_CURSO", "version": 1 }`
- **Flujo:** concurrencia optimista (si la `version` no coincide → **409**) → `operativo.cambiarEstado()` valida la transición → al pasar a `EN_CURSO` registra `fechaInicioReal` → evento `ESTADO`.

## CU-OP-05 Cambiar prioridad

- **RF:** "notificar a las bases navales asignadas cuando cambie el estado o la prioridad de un operativo".
- **Endpoint:** `PATCH /api/v1/operativos/:id/prioridad` · body `{ "prioridad": "CRITICA", "version": 2 }`
- Si la prioridad es la misma no se guarda ni se notifica.

## CU-OP-06 Cerrar operativo

- **RF:** "cerrar un operativo registrando su resultado final y observaciones".
- **Endpoint:** `POST /api/v1/operativos/:id/cierre` · body `{ "resultado": "PARCIAL", "observaciones": "...", "version": 3 }`
- Solo desde `EN_CURSO`. Fija `resultadoFinal` (`EXITOSO|PARCIAL|FALLIDO`), `observacionesCierre` y `fechaCierre`. **No** cambia el estado de los criminales: eso lo decide el cierre de cada enfrentamiento (módulo Incidentes), que es donde consta quién fue capturado.

## CU-OP-07 Tablero y detalle

- **Endpoints:** `GET /api/v1/operativos?estado=&prioridad=&baseNavalId=&criminalId=&q=&page=&limit=` y `GET /api/v1/operativos/:id` · `OPERATIVOS_LEER`
- El detalle agrega el resumen del criminal objetivo y cuántos enfrentamientos están vinculados.

## Puertos que expone

`OPERATIVO_READER` (exportado): `obtenerResumen(id)` → `{ id, codigo, estado, basesIds }`. Lo usa Incidentes para validar el vínculo.
