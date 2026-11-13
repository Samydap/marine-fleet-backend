# Módulo Recompensas (RF-1 / RF-5): Gestión de recompensas

**Carpeta:** `src/modules/recompensas/` · **Clase del diagrama:** `Recompensa` · **Tabla:** `recompensas`

## Idea central

Una recompensa **no se edita: se reemplaza**. Cada monto nuevo es una fila nueva, y la vigente anterior pasa a `HISTORICA` con su `vigente_hasta`. Tres triggers de la base de datos lo garantizan:

- `trg_recompensas_inmutables`: impide cambiar `monto` o `criminal_id`.
- `trg_recompensas_sin_borrado`: impide hacer DELETE.
- `trg_recompensas_historial`: copia cada cambio de estado en `criminales_historial`, con el usuario.

Esto cubre el RNF _"los registros críticos (recompensas, órdenes de captura) no puedan ser alterados sin dejar rastro"_.

Ciclo de estados:

```
PENDIENTE_VALIDACION ──aprobar──> VIGENTE ──(llega otra)──> HISTORICA
        └────────rechazar──────> RECHAZADA
```

Recompensas **no escribe** la tabla `criminales`. Cuando una recompensa queda vigente emite `RECOMPENSA_VIGENTE`, y entonces:

1. Criminales actualiza `recompensa_vigente_monto`.
2. Amenaza reclasifica el nivel.
3. Carteles emite un cartel nuevo.

Esto cubre el beneficio de _"actualización inmediata de recompensas"_.

---

## 1. Solicitar o fijar una recompensa

**RF:** _"registrar y actualizar el monto de la recompensa de cada criminal"_ y _"solicitar y validar recompensas de alto rango por parte del Almirante o del Gobierno Mundial"_.
`POST /api/v1/recompensas` · permiso `RECOMPENSAS_SOLICITAR` (Analista, Capitán, Almirante)

```json
{ "criminalId": "c-nami", "monto": 366000000, "motivo": "Incidente de Wano" }
```

Flujo en `SolicitarRecompensaUseCase`:

1. `Bounty.crear(monto)` valida que el monto sea un número finito y esté entre 0 y el máximo permitido.
2. Por `CRIMINAL_READER` comprueba que el criminal exista y esté `ACTIVO`.
3. Comprueba que el criminal no tenga ya una solicitud pendiente: `RECOMPENSA_PENDIENTE_EXISTENTE`.
4. Aplica la regla de `politica-validacion.ts`, según el monto:

| Monto                                                 | Resultado                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| Menos de 1.000.000.000                                | queda **VIGENTE** de inmediato                                   |
| 1.000.000.000 o más                                   | queda **PENDIENTE_VALIDACION** y requiere la firma del Almirante |
| 1.000.000.000 o más, y quien solicita es el Almirante | se firma en el acto                                              |

5. Para activar usa `ActivarRecompensaService`. En **una sola transacción**, la anterior pasa a HISTORICA y la nueva a VIGENTE, así que nunca hay dos vigentes. Luego emite `RECOMPENSA_VIGENTE`.
6. En todos los casos emite también `RECOMPENSA_SOLICITADA`.

**Errores:** 404 criminal · 400 `CRIMINAL_NO_ACTIVO`, `RECOMPENSA_PENDIENTE_EXISTENTE`, monto inválido · 403.

## 2. Validar (aprobar o rechazar) una recompensa de alto rango

`PATCH /api/v1/recompensas/:id/validacion` · permiso `RECOMPENSAS_VALIDAR` (solo el Almirante, que tiene `ALL`)

```json
{ "aprobar": true }
{ "aprobar": false, "motivo": "Sin pruebas suficientes" }
```

Reglas en `ValidarRecompensaUseCase`:

- El permiso se revisa **dos veces**: en el guard y en el dominio con `asegurarPuedeValidar`. Si mañana otro adaptador invoca el caso de uso, la regla sigue protegida.
- **Segregación de funciones:** quien solicitó la recompensa no puede validarla (`AUTOVALIDACION_NO_PERMITIDA`).
- Solo se valida una recompensa que esté pendiente (`RECOMPENSA_NO_PENDIENTE`).
- Rechazar exige un motivo (`MOTIVO_REQUERIDO`).

## 3. Consultas

| Método | Ruta                                                          | Permiso             | Qué devuelve                      |
| ------ | ------------------------------------------------------------- | ------------------- | --------------------------------- |
| GET    | `/api/v1/recompensas?criminalId=&estado=&requiereValidacion=` | CRIMINALES_LEER     | listado paginado                  |
| GET    | `/api/v1/recompensas/pendientes`                              | RECOMPENSAS_VALIDAR | bandeja del Almirante             |
| GET    | `/api/v1/recompensas/criminal/:criminalId`                    | CRIMINALES_LEER     | historial completo de un criminal |
| GET    | `/api/v1/recompensas/:id`                                     | CRIMINALES_LEER     | detalle                           |

Respuesta típica:

```json
{
  "id": "9667…",
  "criminalId": "c-law",
  "monto": 3000000000,
  "moneda": "BERRIES",
  "estado": "VIGENTE",
  "requiereValidacion": true,
  "solicitadaPor": "u-analista…",
  "validadaPor": "u-almirante",
  "vigenteDesde": "…",
  "vigenteHasta": null
}
```

## Prueba de humo, de punta a punta, ya ejecutada

1. El Analista fija 500.000.000. La recompensa queda VIGENTE, el criminal muestra ese monto y su nivel se recalcula.
2. El Analista solicita 3.000.000.000. Queda PENDIENTE. Si el mismo Analista intenta validar, recibe 403.
3. El Almirante aprueba. La de 500M pasa a HISTORICA y la de 3.000M a VIGENTE. El criminal muestra 3.000M y en el historial aparece _"Almirante de la Marina"_ como autor.

## Pruebas

`npx jest src/modules/recompensas` ejercita:

- vigente inmediata y paso a histórica;
- pendiente por alto rango, y la firma en el acto del Almirante;
- doble pendiente y criminal capturado;
- aprobar, rechazar con motivo, sin permiso y autovalidación.
