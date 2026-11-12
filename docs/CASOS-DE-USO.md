# Cómo funciona el backend — Caso 13

Guía para entender, explicar y sustentar el backend del **Sistema de Gestión de Recompensas y
Captura de Criminales de la Marina**. Este archivo es el índice. El detalle de cada caso de uso,
con su flujo archivo por archivo, está en [`docs/casos/`](casos).

---

## 1. Qué es este repositorio y cómo encaja con el frontend

El sistema son **dos repositorios** que se ejecutan a la vez:

| Repositorio                   | Qué es                                               | Tecnología                                     | Dónde corre                    |
| ----------------------------- | ---------------------------------------------------- | ---------------------------------------------- | ------------------------------ |
| `marine-fleet-backend` (este) | La API: reglas de negocio, seguridad y base de datos | **TypeScript**, NestJS, TypeORM, MySQL/MariaDB | `http://localhost:3000/api/v1` |
| `marine-fleet-frontend`       | Las pantallas                                        | **TypeScript**, React, Vite                    | `http://localhost:5173`        |

El frontend **nunca** toca la base de datos. Le pide todo al backend por HTTP con JSON, y el
backend responde siempre con la misma forma:

```json
{ "success": true, "data": { ... }, "meta": { "page": 1, "total": 12 } }
{ "success": false, "error": { "codigo": "CRIMINAL_DUPLICADO", "message": "...", "status": 400 } }
```

El contrato completo y navegable de los endpoints es Swagger: `http://localhost:3000/api/docs`.

## 2. El recorrido de una petición

```
Frontend ──HTTP──▶ main.ts (prefijo /api, versión v1, helmet, CORS)
   │
   ├─ JwtAuthGuard ......... ¿token válido?                      common/guards
   ├─ RolesGuard ........... ¿el rol tiene el permiso?           common/guards
   ├─ ValidationPipe ....... ¿el cuerpo cumple el DTO?           presentation/dto
   ├─ AuditInterceptor ..... deja rastro en la tabla auditoria   common/interceptors
   │
   ├─ Controller ........... recibe y delega (delgado)           presentation/*.controller.ts
   ├─ Caso de uso .......... aplica la lógica                    application/*.use-case.ts
   ├─ Dominio .............. reglas puras del negocio            domain/*.ts
   ├─ Puerto ............... interfaz ("necesito guardar")       domain/*.port.ts
   ├─ Adaptador ............ implementación con TypeORM          infrastructure/*.ts
   │
   └─ Evento de dominio .... avisa a otros módulos               shared/domain/events
```

**Por qué tantas capas:** cada una tiene un solo trabajo. El caso de uso no sabe que existe
MySQL (habla con el puerto), así que se prueba en milisegundos con un repositorio "en memoria"
(hay 198 pruebas automáticas). Si mañana cambian de base de datos, solo cambia `infrastructure/`.
Estas reglas de capas no son una sugerencia: las verifica ESLint y el CI.

## 3. Mapa de módulos

| Módulo (`src/modules/`)         | Requerimiento                                                   | Documento                                    |
| ------------------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| `criminales`                    | Registro de criminales, organizaciones, antecedentes, historial | [criminales.md](casos/criminales.md)         |
| `recompensas`                   | Solicitud y validación de recompensas                           | [recompensas.md](casos/recompensas.md)       |
| `amenaza`                       | Análisis de riesgo: clasificación automática                    | [amenaza.md](casos/amenaza.md)               |
| `carteles`                      | Carteles Wanted automáticos (PDF / imagen)                      | [carteles.md](casos/carteles.md)             |
| `inteligencia`                  | Avistamientos y reportes ciudadanos                             | [inteligencia.md](casos/inteligencia.md)     |
| `operativos`                    | Coordinación de operativos entre bases                          | [operativos.md](casos/operativos.md)         |
| `incidentes`                    | Historial de enfrentamientos                                    | [incidentes.md](casos/incidentes.md)         |
| `reportes`                      | Reporte mensual por mar, tendencias, estadísticas, PDF/CSV      | [reportes.md](casos/reportes.md)             |
| `sincronizacion`                | Tiempo real (SSE), notificaciones a bases, salud                | [sincronizacion.md](casos/sincronizacion.md) |
| `catalogos`                     | Mares, zonas de influencia, bases navales                       | [catalogos.md](casos/catalogos.md)           |
| `auth`, `usuarios`, `auditoria` | Login, roles, cuentas y bitácora                                | [seguridad.md](casos/seguridad.md)           |

## 4. Cómo se comunican los módulos: eventos

Ningún módulo llama a los casos de uso de otro. Publican **hechos** y los interesados reaccionan.
El contrato de cada evento está en `src/shared/domain/events/eventos.contracts.ts`.

| Cuando pasa...                             | Evento                     | Reaccionan                                                       |
| ------------------------------------------ | -------------------------- | ---------------------------------------------------------------- |
| Se registra un criminal                    | `criminal.registrado`      | Amenaza (clasifica), Carteles (cartel v1), Sincronización        |
| Cambia foto, afiliación, zona o recompensa | `criminal.actualizado`     | Amenaza (reclasifica), Carteles (nueva versión)                  |
| Se captura o muere                         | `criminal.estado-cambiado` | Carteles (sello CAPTURADO), Sincronización                       |
| Una recompensa queda vigente               | `recompensa.vigente`       | Criminales (actualiza el monto) → dispara `criminal.actualizado` |
| Cambia el nivel de amenaza                 | `amenaza.reclasificada`    | Carteles                                                         |
| Cambia un operativo                        | `operativo.actualizado`    | Sincronización (notifica a las bases asignadas)                  |
| Se cierra un enfrentamiento                | `incidente.cerrado`        | Criminales (pasa a CAPTURADO / MUERTO)                           |

**Ejemplo real de la cadena**, que se puede mostrar en vivo: el Almirante aprueba una recompensa
de 1.500 millones. Esa recompensa queda VIGENTE y la anterior pasa a HISTORICA. Criminales
actualiza el monto, Amenaza recalcula el nivel, Carteles emite una versión nueva del PDF, el
trigger de la base registra cada cambio con el usuario y todas las bases lo ven al instante por
SSE. Todo eso sale de **un solo** clic.

## 5. Trazabilidad: requerimiento → endpoint

Todas las rutas van con el prefijo `/api/v1`.

| Requerimiento (resumido)                                          | Endpoint principal                                                                                          | Permiso                         |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Registrar criminal con datos personales y foto                    | `POST /criminales`, `PUT /criminales/:id/foto`                                                              | CRIMINALES_ESCRIBIR             |
| Registrar/actualizar monto de recompensa                          | `POST /recompensas`                                                                                         | RECOMPENSAS_SOLICITAR           |
| Validar recompensas de alto rango (Almirante)                     | `PATCH /recompensas/:id/validacion`                                                                         | RECOMPENSAS_VALIDAR             |
| Asociar afiliaciones                                              | `POST/DELETE /criminales/:id/afiliaciones`                                                                  | CRIMINALES_ESCRIBIR             |
| Modificar o dar de baja                                           | `PATCH /criminales/:id`, `PATCH /criminales/:id/estado`                                                     | CRIMINALES_ESCRIBIR             |
| Antecedentes                                                      | `GET/POST /criminales/:id/antecedentes`                                                                     | CRIMINALES_*                    |
| Buscar y filtrar (nombre, alias, estado, rango, afiliación, zona) | `GET /criminales?q=&estado=&recompensaMin=&recompensaMax=&organizacionId=&categoria=&zonaInfluenciaId=`     | CRIMINALES_LEER                 |
| Tripulaciones / organizaciones / bandas                           | `GET/POST/PATCH /organizaciones`                                                                            | CRIMINALES_*                    |
| Historial de modificaciones del criminal                          | `GET /criminales/:id/historial`                                                                             | CRIMINALES_LEER                 |
| Cartel automático y actualización automática                      | (eventos) + `GET /carteles/criminal/:id`                                                                    | CRIMINALES_LEER                 |
| Descargar cartel PDF o imagen                                     | `GET /carteles/:id/descargar?formato=pdf\|svg`                                                              | CRIMINALES_LEER                 |
| Reporte ciudadano (sin login)                                     | `POST /reportes-ciudadanos`                                                                                 | público, 5/min por IP           |
| Validar reporte antes de volverlo avistamiento                    | `PATCH /reportes-ciudadanos/:id/revision`                                                                   | INTELIGENCIA_REVISAR_REPORTES   |
| Registrar y consultar avistamientos                               | `POST /avistamientos`, `GET /avistamientos?criminalId=&zonaInfluenciaId=&desde=&hasta=&estadoVerificacion=` | INTELIGENCIA_*                  |
| Crear operativo contra un criminal                                | `POST /operativos`                                                                                          | OPERATIVOS_COORDINAR            |
| Asignar bases, recursos y responsables                            | `POST /operativos/:id/bases`, `POST /operativos/:id/responsables`                                           | OPERATIVOS_COORDINAR            |
| Actualizar estado y prioridad (visible a todas las bases)         | `PATCH /operativos/:id/estado`, `PATCH /operativos/:id/prioridad`                                           | OPERATIVOS_COORDINAR            |
| Cerrar operativo con resultado y observaciones                    | `POST /operativos/:id/cierre`                                                                               | OPERATIVOS_COORDINAR            |
| Registrar enfrentamiento y vincularlo al operativo                | `POST /incidentes`, `PATCH /incidentes/:id/operativo`                                                       | INCIDENTES_ESCRIBIR             |
| Historial por criminal, base u operativo                          | `GET /incidentes/por-criminal/:id`, `/por-base/:id`, `/por-operativo/:id`                                   | INCIDENTES_LEER                 |
| Reporte mensual de recompensas por mar                            | `GET /reportes/recompensas-por-mar?periodo=YYYY-MM` (+ `/exportar?formato=csv\|pdf`)                        | REPORTES_LEER                   |
| Clasificación automática Bajo/Medio/Alto                          | (eventos) + `POST /amenaza/clasificar/:id`                                                                  | CRIMINALES_ESCRIBIR             |
| Solo el Analista modifica criterios                               | `PUT /amenaza/criterios` (`@Roles(ANALISTA)`: ni el Almirante entra)                                        | AMENAZA_CONFIGURAR_CRITERIOS    |
| Tendencias por zona, afiliación y nivel                           | `GET /reportes/tendencias?agrupar=zona\|afiliacion\|nivel`                                                  | REPORTES_LEER                   |
| Gráficos de distribución                                          | `GET /reportes/estadisticas`, `GET /amenaza/distribucion`                                                   | REPORTES_LEER / CRIMINALES_LEER |
| Catálogo de mares, zonas y bases navales                          | `GET/POST/PATCH /catalogos/...`                                                                             | CATALOGOS_ADMINISTRAR           |
| Usuarios con rol y base naval                                     | `GET/POST/PATCH /usuarios`                                                                                  | USUARIOS_ADMINISTRAR            |
| Consultar bitácora de auditoría                                   | `GET /auditoria`                                                                                            | AUDITORIA_LEER                  |
| Sincronización entre bases (≤ 15 s)                               | `GET /sincronizacion/stream` (SSE), `GET /sincronizacion/cambios`                                           | token                           |
| Notificar a las bases asignadas                                   | `GET /notificaciones`, `PATCH /notificaciones/:id/leida`                                                    | token                           |
| Disponibilidad 99 % (monitoreo)                                   | `GET /salud`                                                                                                | público                         |

**RNF que no son un endpoint, sino diseño:**

- **Contraseñas con bcrypt:** `auth/infrastructure/bcrypt-hasher.adapter.ts`. La columna
  `password_hash` nunca sale en una respuesta.
- **Rastro de modificaciones:** triggers de MySQL (`trg_criminales_historial_*`,
  `trg_recompensas_*`) más el `AuditInterceptor`. Ver [seguridad.md](casos/seguridad.md).
- **Sin registros duplicados entre bases:** una sola base centralizada, más
  `nombre_normalizado` UNIQUE ("Monkey D. Luffy" = "monkey d luffy").
- **Reportes en menos de 3 s:** consultas agregadas en SQL. Medido sobre la base de prueba:
  JSON en ~10 ms, PDF en ~30 ms.

## 6. Diagrama de clases → código

| Clase del diagrama             | Entidad / tabla                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Criminal                       | `criminales/domain/criminal.entity.ts` → `criminales`                                   |
| Afiliacion                     | `organizacion.entity.ts` + `membresia.entity.ts` → `organizaciones`, `membresias`       |
| Antecedente                    | `antecedente.entity.ts` → `antecedentes`                                                |
| Recompensa                     | `recompensas/domain/recompensa.entity.ts` → `recompensas`                               |
| CartelWanted                   | `carteles/domain/cartel.entity.ts` → `carteles` (versionado)                            |
| Avistamiento, ReporteCiudadano | `inteligencia/domain/*.entity.ts` → `avistamientos`, `reportes_ciudadanos`              |
| Operativo                      | `operativos/domain/operativo.entity.ts` (+ `operativo_bases`, `operativo_responsables`) |
| Enfrentamiento                 | `incidentes/domain/incidente.entity.ts` (+ `incidente_participantes`)                   |
| AnalisisRiesgo                 | `amenaza/domain/analisis-riesgo.entity.ts` → `analisis_riesgo`                          |
| CriterioClasificacion          | `amenaza/domain/criterio-amenaza.entity.ts` → `criterios_amenaza`                       |
| ReporteRecompensas             | tabla `reportes_recompensas` (modelo de lectura de `reportes`)                          |
| Usuario                        | `usuarios/domain/usuario.entity.ts` (+ `roles`)                                         |
| Auditoria                      | `auditoria/domain/auditoria.entity.ts` → `auditoria`                                    |
| BaseNaval                      | `catalogos/entities/base-naval.entity.ts` → `bases_navales`                             |
| Enum Mar                       | tablas `mares` + `zonas_influencia` (catálogo administrable en vez de enum fijo)        |

Diferencias con el diagrama que conviene explicar si preguntan:

- **Mar es una tabla y no un enum**, porque el requerimiento pide _administrar_ el catálogo.
- **EstadoOperativo** del diagrama (PLANEADO / EN_CURSO / COMPLETADO / ABORTADO) en el código es
  PLANIFICADO / EN_CURSO / CERRADO / ABORTADO. Se llega a CERRADO solo con el caso "cerrar
  operativo", que exige resultado final.
- **ResultadoEnfrentamiento** se separó en dos: el resultado del enfrentamiento (EXITO /
  FRACASO / PARCIAL) y el **desenlace de cada criminal** (CAPTURADO / ESCAPO / MUERTO). Así un
  enfrentamiento con tres piratas puede terminar con uno capturado y dos fugados.

## 7. Probarlo de punta a punta

Con la API corriendo (`npm run start:dev`) y la base con migraciones y seed:

```bash
bash scripts/flujo-demo.sh
```

Recorre en 10 pasos login por rol, criminal, recompensa normal y de alto rango, historial,
reporte ciudadano, operativo, enfrentamiento, reportes y auditoría. Imprime qué ocurre en cada
paso, así que sirve también como **guion de la demo**. En Windows se ejecuta con Git Bash y
necesita `jq`.

Antes de la demo, genera los carteles de los criminales del seed con
`POST /api/v1/carteles/regenerar-todos` desde Swagger, iniciando sesión como Analista.

## 8. Revisión de código y límites conocidos

Una revisión independiente encontró y se corrigieron:

- **Concurrencia real:** `ConcurrenciaOptimistaSubscriber` bloquea la fila (`SELECT … FOR UPDATE`)
  dentro de la transacción del `save()`. Probado: 3 ediciones simultáneas con la misma versión
  terminan en 1 éxito y 2 respuestas `409`.
- Aprobar un reporte ciudadano dos veces a la vez ya no duplica el avistamiento.
- Recompensas de alto rango: **siempre** quedan pendientes, aunque las pida el Almirante (regla
  de dos personas). No se aprueban si el criminal ya fue capturado.
- Las fotos de hasta 2 MB entran (límite JSON de 4 MB); en la bitácora no se copia el base64.
- El historial del criminal incluye afiliaciones y antecedentes (triggers nuevos).
- Renombrar una organización regenera los carteles de sus miembros.
- El canal SSE exige `CRIMINALES_LEER`, se cierra a los 15 min y el token no queda en los logs.
- Consultar el reporte de un mes cerrado no reescribe su instantánea.

Límites aceptados para el alcance del semestre:

- Un refresh token no se puede revocar antes de que venza (7 días). Un bloqueo de cuenta sí
  impide renovar.
- La marca "leída" de una notificación global es compartida por todos los usuarios.
- El límite de reportes ciudadanos y el buffer de SSE viven en memoria: sirven con una sola
  instancia del servidor.
- El formulario ciudadano necesita el `criminalId`. Puede tomarse de un cartel publicado.
