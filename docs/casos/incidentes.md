# Módulo Incidentes (RF-6 Historial de incidentes y enfrentamientos)

**Carpeta:** `src/modules/incidentes/` · **Clase del diagrama:** `Enfrentamiento` · **Tablas:** `incidentes`, `incidente_participantes`

No hay que confundirla con `criminales_historial`: esa tabla la llena un trigger y guarda cambios de atributos (nombre, recompensa...). `incidentes` guarda **hechos operativos**: enfrentamientos, capturas, fugas.

## Reglas generales

- **Participantes de ambos bandos:** criminales en `incidente_participantes` (con rol `OBJETIVO|COMPLICE|TESTIGO` y desenlace `CAPTURADO|ESCAPO|MUERTO|DESCONOCIDO`); marinos en la columna JSON `participantes_marina` (`{ nombre, rango?, usuarioId? }`).
- **Frontera entre módulos:** este módulo **nunca** escribe la tabla `criminales`. Al cerrar un enfrentamiento publica `INCIDENTE_CERRADO` con los desenlaces, y Criminales cambia a `CAPTURADO`/`MUERTO` a quien corresponda (lo que además regenera el cartel).
- **Base propia:** un usuario con base solo registra o modifica enfrentamientos de su base. La **lectura** del historial no se limita por base: es inteligencia compartida.
- **Concurrencia optimista:** corregir, vincular y cerrar exigen la `version` leída (409 si cambió).

## CU-IN-01 Registrar enfrentamiento

- **RF:** "registrar enfrentamientos entre marinos y criminales, incluyendo fecha, ubicación, participantes, criminal involucrado, resultado y observaciones."
- **Endpoint:** `POST /api/v1/incidentes` · permiso `INCIDENTES_ESCRIBIR`
- **Flujo:**
  1. `RegistrarIncidenteDto` valida fecha, ubicación, descripción y la lista de criminales (mínimo 1).
  2. `RegistrarIncidenteUseCase` comprueba que no haya criminales repetidos y que todos existan (`CRIMINAL_READER.obtenerResumenes`).
  3. Si llega `operativoId`, lo valida con `OPERATIVO_READER`.
  4. La base es la enviada o la del usuario; la zona por defecto es la del primer criminal.
  5. Si llega un `resultado` distinto de `EN_CURSO`, el enfrentamiento queda cerrado de una vez.
  6. Guarda el incidente y los participantes; publica `INCIDENTE_REGISTRADO` (y `INCIDENTE_CERRADO` si quedó cerrado).
- **Ejemplo:**
  ```json
  {
    "fechaHora": "2026-11-11T15:00:00Z",
    "ubicacion": "Muelle 3 de Loguetown",
    "descripcion": "Choque con la tripulación",
    "operativoId": "<id>",
    "criminales": [
      { "criminalId": "c-buggy" },
      { "criminalId": "c-nami", "rolEnIncidente": "COMPLICE" }
    ],
    "marinos": [{ "nombre": "Capitán Smoker", "rango": "Capitán" }],
    "bajasMarina": 1
  }
  ```
- **Errores:** 404 criminal u operativo · 400 `PARTICIPANTE_REPETIDO` · 403 base ajena.

## CU-IN-02 Vincular a un operativo

- **RF:** "vincular un enfrentamiento registrado (Historial de Incidentes) al operativo del cual se originó, cuando aplique."
- **Endpoint:** `PATCH /api/v1/incidentes/:id/operativo` · body `{ "operativoId": "...", "version": 1 }`
- También se puede vincular al registrar (campo `operativoId`).

## CU-IN-03 Cerrar enfrentamiento

- **Endpoint:** `POST /api/v1/incidentes/:id/cierre` · body `{ "resultado": "PARCIAL", "desenlaces": [{ "criminalId": "c-buggy", "desenlace": "CAPTURADO" }], "version": 1 }`
- **Reglas (en `Incidente.cerrar()`):** no se cierra dos veces; el resultado final no puede ser `EN_CURSO`; un desenlace solo puede referirse a un criminal que participó.
- **Efecto encadenado:** `INCIDENTE_CERRADO` → Criminales pone a Buggy en `CAPTURADO` → Carteles genera nueva versión del cartel → Sincronización avisa a las bases. Verificado contra MariaDB.

## CU-IN-04 Corregir registro

- **Endpoint:** `PATCH /api/v1/incidentes/:id` · body con los campos descriptivos a corregir + `version`.
- Corrige tipo, fecha, ubicación, descripción, zona, observaciones, bajas y marinos. **No** corrige resultado ni desenlaces: esos ya dispararon cambios en otros módulos.

## CU-IN-05 Consultar historial

- **RF:** "consultar el historial de enfrentamientos por criminal, base naval u operativo."
- **Endpoints** (`INCIDENTES_LEER`, paginados):
  - `GET /api/v1/incidentes/por-criminal/:criminalId`
  - `GET /api/v1/incidentes/por-base/:baseNavalId`
  - `GET /api/v1/incidentes/por-operativo/:operativoId`
  - `GET /api/v1/incidentes?criminalId=&baseNavalId=&operativoId=&tipo=&desde=&hasta=` (combinables)
  - `GET /api/v1/incidentes/:id`
- Los tres atajos usan el mismo caso de uso (`HistorialIncidentesUseCase`) con un filtro distinto.
