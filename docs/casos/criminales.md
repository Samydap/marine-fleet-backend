# Módulo Criminales (RF-1): Registro de criminales

**Carpeta:** `src/modules/criminales/` · **Clases del diagrama:** `Criminal`, `Afiliacion`, `Antecedente`, `Auditoria` (historial)
**Tablas:** `criminales`, `organizaciones`, `membresias`, `antecedentes`, `criminales_historial`

## Cómo está armado

```
presentation/   criminales.controller.ts     (registro, búsqueda, datos, foto, estado)
                expediente.controller.ts     (afiliaciones, antecedentes, historial)
                organizaciones.controller.ts (tripulaciones, organizaciones, bandas)
                dto/ (validación)  mappers/ (qué sale al cliente)
application/    un archivo por caso de uso (*.use-case.ts)
domain/         entidades con reglas (criminal.entity.ts) + puertos (*.port.ts)
infrastructure/ adaptadores TypeORM + listeners/criminales.listener.ts
testing/        dobles en memoria para las pruebas unitarias
```

Recorrido de cualquier petición: **Controller** (valida con el DTO y revisa el permiso) → **caso de uso** (aplica la regla) → **puerto** (interfaz) → **adaptador TypeORM** (SQL) → **evento** (avisa a los otros módulos).

**Lo que este módulo exporta a los demás:**

- `CRIMINAL_READER`: lectura para Carteles, Amenaza, Recompensas, Inteligencia, Operativos e Incidentes.
- `CRIMINAL_NIVEL_WRITER`: la única escritura de otro módulo. Amenaza la usa para guardar el nivel de amenaza.

**Trazabilidad:** la tabla `criminales_historial` se llena con triggers de la base de datos (`trg_criminales_historial_*`), no desde el código. Cada escritura deja `actualizado_por` con el usuario, y el trigger copia ese dato en el historial. Así incluso un UPDATE hecho a mano en phpMyAdmin queda registrado.

---

## 1. Registrar criminal

**RF:** _"El sistema debe permitir registrar un nuevo criminal con datos personales (nombre, alias, edad, descripción física, foto)"_ y _"asociar afiliaciones a cada criminal"_.
`POST /api/v1/criminales` · permiso `CRIMINALES_ESCRIBIR` (Analista, Director, Capitán, Almirante)

Flujo:

1. `CrearCriminalDto` valida los campos: nombre de 2 a 150 caracteres, edad entre 0 y 500, máximo 10 alias.
2. `RegistrarCriminalUseCase` normaliza el nombre con `normalizarNombre`, de modo que "Monkey D. Luffy" y "monkey d luffy" quedan iguales. Si ya existe uno con ese nombre responde `CRIMINAL_DUPLICADO`.
3. Si viene `organizacionId`, verifica que exista **antes** de guardar, para no dejar un criminal a medio registrar.
4. Guarda el criminal con nivel `PENDIENTE` y, si aplica, la membresía.
5. Emite `CRIMINAL_REGISTRADO` y espera a los oyentes con `emitAsync`:
   - Amenaza calcula el nivel.
   - Carteles genera el cartel v1.

   Si un oyente falla, el registro se conserva y el error queda en el log (`publicar-evento.ts`).

6. Responde el criminal releído, ya con el nivel calculado.

```json
// petición
{ "nombre": "Trafalgar D. Water Law", "alias": ["Cirujano de la Muerte"], "edad": 26,
  "zonaInfluenciaId": "z-sabaody", "organizacionId": "org-barbanegra", "rolEnOrganizacion": "MIEMBRO" }
// respuesta 201 (resumida)
{ "success": true, "data": { "id": "10bb…", "nivelAmenaza": "PENDIENTE", "version": 1,
  "organizacion": { "organizacionNombre": "Piratas de Barbanegra", "categoria": "PIRATA", "rol": "MIEMBRO" },
  "afiliaciones": [ … ] } }
```

**Errores:** 400 `CRIMINAL_DUPLICADO` · 404 `NO_ENCONTRADO` (la organización no existe) · 400 validación · 403 sin permiso.

## 2. Buscar y filtrar criminales

**RF:** _"buscar y consultar criminales por nombre, alias, estado, rango de recompensa, afiliación y zona de influencia"_ y _"filtrar la lista según su afiliación y su zona de influencia marina"_.
`GET /api/v1/criminales?q=&estado=&nivelAmenaza=&zonaInfluenciaId=&organizacionId=&categoria=&recompensaMin=&recompensaMax=&page=&limit=&order=` · `CRIMINALES_LEER`

- El parámetro `q` busca en el nombre y también dentro del arreglo JSON de alias: `q=joker` devuelve a Doflamingo.
- `categoria` puede ser `PIRATA`, `REVOLUCIONARIO` o `CRIMINAL_INDEPENDIENTE`. Filtra por la afiliación **vigente**, con una subconsulta `EXISTS`.
- Los resultados se ordenan por recompensa. La respuesta trae `meta` con la paginación.

Todo está en `TypeOrmCriminalRepository.aplicarFiltros`, y siempre con parámetros: nunca se concatena texto del usuario en el SQL.

## 3. Ver detalle

`GET /api/v1/criminales/:id` · `CRIMINALES_LEER`. Devuelve los datos, la afiliación principal (la de mayor rango vigente), todas las afiliaciones vigentes y la `version`.

## 4. Modificar datos personales

**RF:** _"modificar … el registro de un criminal"_ y _"sincronizar automáticamente la información de un criminal entre todas las bases navales … sin registros duplicados"_.
`PATCH /api/v1/criminales/:id` · `CRIMINALES_ESCRIBIR`

1. `ActualizarCriminalDto` es obligatorio porque trae la `version` que el usuario leyó. Los demás campos son opcionales, y `null` borra el valor.
2. `ActualizarCriminalUseCase` compara la versión. Si otra base ya modificó el registro, responde **409 `CONFLICTO_CONCURRENCIA`**. Esto es la concurrencia optimista: ningún cambio de otra base se pisa en silencio.
3. `Criminal.actualizarDatos()` aplica solo lo que cambió y devuelve los **motivos**: `ZONA` si cambió la zona y `DATOS` para lo demás. Si no cambió nada, no guarda ni emite evento.
4. Si cambia el nombre, recalcula `nombre_normalizado` y valida que no choque con el de otro criminal.
5. Emite `CRIMINAL_ACTUALIZADO { motivos }`:
   - Con `ZONA`, Amenaza reclasifica.
   - Carteles decide con los motivos si emite una versión nueva del cartel.

**Errores:** 409 por versión · 400 `CRIMINAL_DUPLICADO` · 400 `CRIMINAL_CERRADO` (un MUERTO no se edita) · 404.

## 5. Subir o cambiar la foto

**RF:** foto en el registro, y _"actualizar automáticamente el cartel cuando cambie la foto"_.
`PUT /api/v1/criminales/:id/foto` · `CRIMINALES_ESCRIBIR`

```json
{ "mime": "image/png", "imagenBase64": "data:image/png;base64,iVBORw0KGgo…" }
```

1. El controller decodifica el base64.
2. `CambiarFotoCriminalUseCase` valida tres cosas:
   - Formato JPG, PNG o WEBP.
   - Tamaño máximo de 2 MB.
   - **Firma binaria real del archivo** (magic bytes): un `.exe` renombrado a `.png` se rechaza.
3. Guarda el archivo en `STORAGE_PORT`, en la ruta `fotos/<id>/<uuid>.png`. En la columna `criminales.foto` queda solo `{url, mime, tamano_bytes}`.
4. Emite `CRIMINAL_ACTUALIZADO { motivos: ['FOTO'] }`, y Carteles regenera el cartel.

**Errores:** 400 `FOTO_FORMATO_INVALIDO`, `FOTO_TAMANO_INVALIDO`, `FOTO_CONTENIDO_INVALIDO`.

## 6. Dar de baja (capturado o muerto)

**RF:** _"modificar o dar de baja (marcar como capturado/muerto) el registro de un criminal"_.
`PATCH /api/v1/criminales/:id/estado` · `CRIMINALES_ESCRIBIR` · body `{ "estado": "CAPTURADO", "version": 3 }`

Es una baja **lógica**: el registro nunca se borra.

**Transiciones válidas** (definidas en `estado-criminal.enum.ts`):

| Desde     | Puede pasar a         |
| --------- | --------------------- |
| ACTIVO    | CAPTURADO, MUERTO     |
| CAPTURADO | ACTIVO (fuga), MUERTO |
| MUERTO    | ninguno: es final     |

También exige la versión (409 si cambió). Emite `CRIMINAL_ESTADO_CAMBIADO` y Carteles marca el cartel como CAPTURADO.
**Errores:** 400 `TRANSICION_INVALIDA` · 409.

## 7. Afiliar y desafiliar

**RF:** _"asociar afiliaciones (tripulación, organización, banda) a cada criminal"_.

- `POST /api/v1/criminales/:id/afiliaciones` con `{ "organizacionId": "org-sombrero-paja", "rol": "OFICIAL" }`
- `DELETE /api/v1/criminales/:id/afiliaciones/:organizacionId`

Ambas requieren `CRIMINALES_ESCRIBIR`.

Reglas en `AfiliarAOrganizacionUseCase`:

- No se repite la misma afiliación vigente: responde `AFILIACION_DUPLICADA`.
- Si el criminal cambia de rol, la membresía anterior se **cierra** (`vigente=0` y `fecha_salida`) y se abre una nueva. Así queda la historia.
- Solo puede haber un `LIDER` vigente por organización: `LIDER_EXISTENTE`.
- No se afilia a una organización inactiva ni a un criminal MUERTO.

Desafiliar no borra la fila: la cierra. Ambas operaciones emiten `CRIMINAL_ACTUALIZADO { motivos: ['AFILIACION'] }` y el cartel muestra la nueva tripulación.

## 8. Organizaciones (tripulaciones, organizaciones y bandas)

**RF:** _"registrar y administrar tripulaciones, organizaciones y bandas, indicando su tipo (pirata, revolucionario, criminal independiente), líder y miembros conocidos"_.

| Método | Ruta                                                                             | Permiso  | Qué hace                                                      |
| ------ | -------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------- |
| GET    | `/api/v1/organizaciones?categoria=&tipoAgrupacion=&zonaInfluenciaId=&activa=&q=` | LEER     | listado                                                       |
| GET    | `/api/v1/organizaciones/:id?historicos=true`                                     | LEER     | detalle con `lider`, `miembros` y `totalMiembrosVigentes`     |
| POST   | `/api/v1/organizaciones`                                                         | ESCRIBIR | crear                                                         |
| PATCH  | `/api/v1/organizaciones/:id`                                                     | ESCRIBIR | editar; `activa:false` disuelve la organización (baja lógica) |

Una sola tabla con la columna `categoria` cubre las tres entidades del universo: Piratas, Ejército Revolucionario y organizaciones independientes. La columna `tipo_agrupacion` distingue tripulación, organización y banda.

## 9. Antecedentes

**RF:** _"registrar antecedentes y delitos cometidos por cada criminal"_.

- `GET /api/v1/criminales/:id/antecedentes` (permiso LEER)
- `POST /api/v1/criminales/:id/antecedentes` (permiso ESCRIBIR) con `{ "tipoDelito": "Piratería", "descripcion": "…", "fechaHecho": "2025-01-01T00:00:00Z", "ubicacion": "Punk Hazard" }`

## 10. Historial de modificaciones

**RF:** _"consultar el historial de modificaciones de un criminal (recompensa, estado, afiliación, datos personales)"_, _"registrar un historial (log) de cada modificación … qué usuario y en qué fecha"_ y _"los registros críticos no puedan ser alterados sin dejar rastro"_.
`GET /api/v1/criminales/:id/historial?campo=&page=&limit=` · `CRIMINALES_LEER`

Ejemplo de respuesta, real, de la prueba de humo:

```
REGISTRO                     null        -> Trafalgar D. Water Law   Analista
recompensa_vigente_monto     null        -> 500000000.00            Analista
nivel_amenaza                PENDIENTE   -> ALTO                    Analista
recompensa:9f3d…             VIGENTE     -> HISTORICA               Analista
recompensa:9667…             PENDIENTE_VALIDACION -> VIGENTE        Almirante
recompensa_vigente_monto     500000000   -> 3000000000              Almirante
edad                         26          -> 27                      Analista
```

## 11. Reacciones automáticas a otros módulos

Están en `infrastructure/listeners/criminales.listener.ts`. Ningún oyente deja escapar una excepción.

| Evento                             | Caso de uso                        | Efecto                                                                                                                            |
| ---------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `RECOMPENSA_VIGENTE` (Recompensas) | `AplicarRecompensaVigenteUseCase`  | actualiza `recompensa_vigente_monto` y emite `CRIMINAL_ACTUALIZADO {RECOMPENSA}` → Amenaza reclasifica y Carteles regenera        |
| `INCIDENTE_CERRADO` (Incidentes)   | `AplicarDesenlaceIncidenteUseCase` | si el desenlace es CAPTURADO o MUERTO, cambia el estado y emite `CRIMINAL_ESTADO_CAMBIADO`; las transiciones inválidas se ignoran |

Así, Recompensas e Incidentes **nunca escriben** la tabla `criminales`: respetan la frontera del agregado.

## Pruebas

`npx jest src/modules/criminales`:

- registro: duplicados, afiliación, eventos, y que un oyente caído no deshaga el registro;
- actualización: motivos, versión, renombrado;
- foto: firma binaria y tamaño;
- afiliaciones: un solo líder, historia al cambiar de rol;
- reacciones a eventos externos.
