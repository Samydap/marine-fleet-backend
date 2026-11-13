# Módulo Inteligencia (RF-3): Centro de Inteligencia

**Carpeta:** `src/modules/inteligencia/` · **Clases del diagrama:** `Avistamiento`, `ReporteCiudadano` · **Tablas:** `avistamientos`, `reportes_ciudadanos`

## Requerimientos cubiertos

| Requerimiento                                                                                   | Caso de uso                                                     | Endpoint                                                                                       | Permiso                         |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| "Registrar avistamientos de un criminal (fecha, ubicación, testigo)."                           | `RegistrarAvistamientoUseCase`                                  | `POST /api/v1/avistamientos`                                                                   | `INTELIGENCIA_ESCRIBIR`         |
| "Consultar avistamientos por criminal, zona, fecha o estado de verificación."                   | `ConsultarAvistamientosUseCase`                                 | `GET /api/v1/avistamientos?criminalId=&zonaInfluenciaId=&desde=&hasta=&estadoVerificacion=&q=` | `INTELIGENCIA_LEER`             |
| (corrección)                                                                                    | `ActualizarAvistamientoUseCase` / `EliminarAvistamientoUseCase` | `PUT` / `DELETE /api/v1/avistamientos/:id`                                                     | `INTELIGENCIA_ESCRIBIR`         |
| (verificación)                                                                                  | `VerificarAvistamientoUseCase`                                  | `PATCH /api/v1/avistamientos/:id/verificacion`                                                 | `INTELIGENCIA_REVISAR_REPORTES` |
| "Permitir a ciudadanos o informantes reportar información sobre criminales."                    | `RegistrarReporteCiudadanoUseCase`                              | `POST /api/v1/reportes-ciudadanos`                                                             | **público** (máx. 5/min por IP) |
| (bandeja)                                                                                       | `ListarReportesUseCase`                                         | `GET /api/v1/reportes-ciudadanos?estado=&criminalId=&zonaInfluenciaId=`                        | `INTELIGENCIA_LEER`             |
| "Validar o verificar los reportes ciudadanos antes de convertirlos en avistamientos oficiales." | `RevisarReporteUseCase`                                         | `PATCH /api/v1/reportes-ciudadanos/:id/revision`                                               | `INTELIGENCIA_REVISAR_REPORTES` |

## Dos fuentes de información, dos niveles de confianza

```
Marino (con sesión) ──▶ Avistamiento OFICIAL, estado PENDIENTE ──▶ Director: VERIFICADO / DESCARTADO
Ciudadano (público) ──▶ ReporteCiudadano PENDIENTE ──▶ Director: APROBADO ──▶ Avistamiento REPORTE_CIUDADANO, VERIFICADO
                                                               └─▶ RECHAZADO (con motivo)
```

## Caso: registrar avistamiento

1. **Controller** `AvistamientosController.crear` recibe el `AvistamientoDto` (validado con class-validator: `fechaHora` con formato, `ubicacion` 3–500 caracteres, `testigo` ≤ 150).
2. **Caso de uso** `RegistrarAvistamientoUseCase`:
   - `CRIMINAL_READER.obtenerResumen()` → si no existe, 404 (antes era `criminalExiste` de la v1).
   - `ZONA_CATALOGO.existeZona()` → si la zona no existe, 400 `ZONA_INVALIDA`.
   - `parsearFechaHora()` (dominio, portado de la v1): acepta `YYYY-MM-DDTHH:mm` del `<input type="datetime-local">` como **hora de Colombia** o una fecha ISO; rechaza fechas imposibles (31 de febrero) y **futuras**.
   - Crea el avistamiento `OFICIAL` en estado `PENDIENTE`.
3. **Adaptador** `TypeOrmAvistamientoRepository` lo guarda (consultas parametrizadas, como en la v1).
4. **Evento** `avistamiento.registrado`: lo escucha Sincronización para avisar a las demás bases.

Ejemplo:

```json
POST /api/v1/avistamientos
{ "criminalId": "c-zoro", "fechaHora": "2026-11-10T14:30", "ubicacion": "Puerto de Loguetown",
  "testigo": "Patrulla", "zonaInfluenciaId": "z-loguetown" }

→ 201 { "success": true, "data": { "id": "f111…", "criminalNombre": "Roronoa Zoro",
        "fechaHora": "2026-11-10T19:30:00.000Z", "estadoVerificacion": "PENDIENTE", "origen": "OFICIAL", … } }
```

**Regla:** un avistamiento `VERIFICADO` es inteligencia oficial: **no se edita ni se borra**; si resultó falso se **descarta** (queda el rastro). Uno `PENDIENTE` o `DESCARTADO` sí se corrige o se borra.

## Caso: reporte ciudadano y su revisión

1. `POST /reportes-ciudadanos` es `@Public()` (lo usa la ciudadanía) y pasa por `LimiteReportesGuard`: máximo **5 reportes por minuto por IP** → 429.
2. Si el informante marca `anonimo: true`, **no se guarda** su nombre ni su contacto.
3. Al ciudadano solo se le responde `{ id, estado, mensaje }`: nunca datos internos.
4. El Director revisa con `PATCH /reportes-ciudadanos/:id/revision`:
   - `{"decision":"APROBADO"}` → se crea el avistamiento oficial (`origen = REPORTE_CIUDADANO`, `VERIFICADO`, testigo = nombre del informante o "Informante anonimo") **en la misma transacción** que marca el reporte como aprobado y guarda `avistamiento_id`. Emite `reporte.aprobado` y `avistamiento.registrado`.
   - `{"decision":"RECHAZADO","motivoRechazo":"…"}` → el motivo es obligatorio.
   - Un reporte se revisa **una sola vez** (`REPORTE_YA_REVISADO`).

## Columnas nuevas (migración `1731200300000-AmpliarModelo`)

La v1 solo tenía `id, criminal_id, fecha_hora, ubicacion`. Se agregaron: `testigo`, `zona_influencia_id`, `estado_verificacion` (PENDIENTE / VERIFICADO / DESCARTADO), `origen` (OFICIAL / REPORTE_CIUDADANO), `observaciones`, `registrado_por`, `verificado_por`, `created_at`; y `zona_influencia_id` en `reportes_ciudadanos`.

## Errores

| Situación                                  | HTTP | Código                                     |
| ------------------------------------------ | ---- | ------------------------------------------ |
| Criminal inexistente                       | 404  | `NO_ENCONTRADO`                            |
| Zona inexistente                           | 400  | `ZONA_INVALIDA`                            |
| Fecha mal escrita o inexistente / futura   | 400  | `FECHA_INVALIDA` / `FECHA_FUTURA`          |
| Editar o borrar un avistamiento verificado | 400  | `AVISTAMIENTO_VERIFICADO`                  |
| Verificar con el mismo estado              | 400  | `TRANSICION_INVALIDA`                      |
| Rechazar sin motivo / revisar dos veces    | 400  | `MOTIVO_REQUERIDO` / `REPORTE_YA_REVISADO` |
| `desde` posterior a `hasta`                | 400  | `RANGO_INVALIDO`                           |
| Más de 5 reportes por minuto               | 429  | `HTTP`                                     |

## Pruebas

`domain/fecha-hora.spec.ts`, `application/avistamientos.use-cases.spec.ts`, `application/reportes-ciudadanos.use-cases.spec.ts`, `presentation/guards/limite-reportes.guard.spec.ts`.
