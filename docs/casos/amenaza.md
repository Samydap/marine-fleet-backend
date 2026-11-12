# Módulo Amenaza (RF-5): Análisis y clasificación de riesgo

**Carpeta:** `src/modules/amenaza/` · **Clases del diagrama:** `AnalisisRiesgo`, `CriterioClasificacion`
**Tablas:** `criterios_amenaza`, `analisis_riesgo` (y la columna `criminales.nivel_amenaza`, por medio de un puerto)

## Idea central

- **Amenaza DECIDE el nivel y Criminales lo GUARDA.** La decisión la toma `domain/motor-clasificacion.ts`, una función pura que no usa base de datos ni NestJS y se prueba en milisegundos. El resultado se guarda a través de `CRIMINAL_NIVEL_WRITER`, la única escritura que otro módulo puede hacer sobre un criminal.
- **Los umbrales no están en el código:** están en la tabla `criterios_amenaza` y están versionados.
- **Peso de la zona:** si el criminal opera en la Grand Line o cerca del Cuartel General (Sabaody, Marineford o Mary Geoise), su nivel sube un escalón: BAJO pasa a MEDIO y MEDIO a ALTO. El dato lo aporta Catalogos a través del puerto `CONTEXTO_ZONA_PROVIDER`.

Criterios iniciales del seed:

| Nivel     | Recompensa (berries)      |
| --------- | ------------------------- |
| PENDIENTE | sin recompensa            |
| BAJO      | 1 – 99.999.999            |
| MEDIO     | 100.000.000 – 999.999.999 |
| ALTO      | 1.000.000.000 en adelante |

---

## 1. Clasificar un criminal (automático)

**RF:** _"clasificar automáticamente el nivel de amenaza de un criminal (Bajo, Medio, Alto) basándose en el rango numérico de su recompensa"_ y _"Análisis de Riesgo: clasificación automática según peligrosidad y zona de influencia"_.

Nadie pulsa un botón. `infrastructure/listeners/amenaza.listener.ts` escucha dos eventos:

- `CRIMINAL_REGISTRADO`;
- `CRIMINAL_ACTUALIZADO`, cuando los motivos incluyen `RECOMPENSA` o `ZONA`.

Flujo en `ClasificarCriminalUseCase`:

1. Lee el criminal con `CRIMINAL_READER`: monto vigente, zona y nivel actual.
2. Lee los criterios **vigentes**.
3. Obtiene el contexto de la zona: si es Grand Line o si está cerca del Cuartel General.
4. Llama a `clasificarAmenaza(monto, criterios, zona)` y obtiene `{ nivel, nivelBase, escalado, justificacion }`.
5. Guarda el nivel con `CRIMINAL_NIVEL_WRITER`. Usa `update()`, que no mueve la `version`, porque es una acción del sistema y no del usuario. El trigger de la base igual registra el cambio en el historial.
6. Inserta una fila en `analisis_riesgo`, es decir, deja constancia de _por qué_ quedó ese nivel.
7. Si el nivel cambió, emite `AMENAZA_RECLASIFICADA`.

Disparo manual: `POST /api/v1/amenaza/clasificar/:criminalId` · `CRIMINALES_ESCRIBIR`. Respuesta real:

```json
{
  "nivel": "ALTO",
  "nivelBase": "MEDIO",
  "escalado": true,
  "justificacion": "Bounty de 500000000 clasifica como MEDIO, escalado a ALTO por operar en zona de alta sensibilidad.",
  "criminalId": "c-usopp",
  "nivelAnterior": "ALTO",
  "cambio": false,
  "montoEvaluado": 500000000
}
```

## 2. Modificar los criterios (solo el Analista de Datos)

**RNF:** _"El sistema debe asegurar que únicamente el perfil de Analista de Datos pueda modificar los criterios de clasificación de amenaza basados en las recompensas."_
`PUT /api/v1/amenaza/criterios` · `@Roles(ANALISTA_DATOS_CRIMINALES)` y `@RequierePermisos(AMENAZA_CONFIGURAR_CRITERIOS)`

> Por qué lleva **los dos** decoradores: el Almirante tiene el permiso `ALL`, que abre cualquier `@RequierePermisos`. El `@Roles` es lo que lo deja por fuera. Verificado en la prueba: el Almirante recibe 403 con _"restringida a: ANALISTA_DATOS_CRIMINALES"_.

```json
{
  "criterios": [
    { "nivel": "BAJO", "montoMinimo": 1, "montoMaximo": 149999999 },
    { "nivel": "MEDIO", "montoMinimo": 150000000, "montoMaximo": 1499999999 },
    { "nivel": "ALTO", "montoMinimo": 1500000000, "montoMaximo": null }
  ],
  "motivo": "Ajuste tras la Guerra de Marineford"
}
```

Flujo en `ActualizarCriteriosUseCase`:

1. `validarCriterios()`, función pura del dominio, exige que:
   - estén exactamente BAJO, MEDIO y ALTO;
   - BAJO empiece en 1;
   - ALTO no tenga tope (`montoMaximo: null`);
   - los rangos sean contiguos y sin huecos.
2. En **una transacción**, los criterios vigentes pasan a `vigente=0` con `vigente_hasta`, y se insertan los nuevos con `modificado_por` y `motivo`. No hay ningún instante sin criterios.
3. Emite `CRITERIOS_AMENAZA_ACTUALIZADOS`.
4. Ejecuta `ReclasificarMasivoUseCase` sobre todos los criminales.
5. Responde `{ criterios, reclasificacion: { total, reclasificados, sinCambio, errores, duracionMs } }`.

**Errores:** 400 `CRITERIOS_INCOMPLETOS`, `CRITERIOS_INVALIDOS`, `CRITERIOS_NO_CONTIGUOS` · 403 si no es el Analista.

## 3. Reclasificar a todos

`POST /api/v1/amenaza/reclasificar` · solo el Analista. Se usa también al cambiar los criterios.

Recorre los criminales en secuencia para no saturar el pool de 10 conexiones. Si un criminal falla, se reporta en `errores` y el resto continúa. En la prueba, 13 criminales se reclasificaron en unos 100 ms.

## 4. Consultas

| Método | Ruta                                             | Permiso         | Uso                                                       |
| ------ | ------------------------------------------------ | --------------- | --------------------------------------------------------- |
| GET    | `/api/v1/amenaza/criterios`                      | CRIMINALES_LEER | criterios vigentes                                        |
| GET    | `/api/v1/amenaza/criterios/historial`            | CRIMINALES_LEER | todas las versiones de los criterios, con quién y por qué |
| GET    | `/api/v1/amenaza/distribucion?soloActivos=true`  | CRIMINALES_LEER | **datos para el gráfico**: total y porcentaje por nivel   |
| GET    | `/api/v1/amenaza/analisis/:criminalId?limite=20` | CRIMINALES_LEER | historial de análisis del criminal                        |

La distribución cubre el RNF _"gráficos de distribución sencillos y claros"_. Siempre devuelve los 4 niveles, aunque alguno tenga 0:

```json
{
  "total": 11,
  "soloActivos": true,
  "niveles": [
    { "nivel": "BAJO", "total": 3, "porcentaje": 27.3 },
    { "nivel": "MEDIO", "total": 1, "porcentaje": 9.1 },
    { "nivel": "ALTO", "total": 6, "porcentaje": 54.5 },
    { "nivel": "PENDIENTE", "total": 1, "porcentaje": 9.1 }
  ]
}
```

## Pruebas

`npx jest src/modules/amenaza`:

- el motor: rangos, escalamiento por zona, tope en ALTO, y el caso sin criterios;
- el validador de criterios: completos, contiguos, ALTO sin tope, BAJO desde 1;
- la clasificación: que registre el análisis, que emita el evento solo si cambia el nivel, el caso PENDIENTE, y el cambio de criterios con reclasificación masiva.
