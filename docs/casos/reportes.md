# Módulo Reportes: Análisis y Reportes

**Carpeta:** `src/modules/reportes/` · **Clase del diagrama:** `ReporteRecompensas` · **Tabla propia:** `reportes_recompensas`

## Requerimientos cubiertos

| Requerimiento                                                                                                                       | Endpoint (permiso `REPORTES_LEER`)                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| "Generar un reporte mensual que resuma el total acumulado en recompensas activas por cada uno de los Cuatro Mares y la Grand Line." | `GET /api/v1/reportes/recompensas-por-mar?periodo=YYYY-MM` · historial: `GET …/recompensas-por-mar/historial` |
| "Generar reportes de tendencias criminales por zona, afiliación y nivel de amenaza."                                                | `GET /api/v1/reportes/tendencias?agrupar=zona\|afiliacion\|nivel`                                             |
| RNF: "La interfaz de estadísticas debe presentar gráficos de distribución sencillos y claros…"                                      | `GET /api/v1/reportes/estadisticas` (datos listos para graficar)                                              |
| "Exportar reportes y estadísticas en formatos PDF o CSV."                                                                           | `…/recompensas-por-mar/exportar`, `…/tendencias/exportar`, `…/estadisticas/exportar` con `?formato=pdf\|csv`  |
| RNF: "Los reportes … deben generarse y descargarse en un tiempo máximo de 3 segundos."                                              | Una consulta agregada por reporte (ver Rendimiento)                                                           |

Tienen permiso `REPORTES_LEER`: Almirante, Director de Inteligencia, Analista de Datos y Coordinador de Operaciones.

## Arquitectura: modelo de lectura (estilo CQRS)

Los reportes **no modifican** datos de otros módulos: los **leen**. En lugar de pedirle a cada módulo sus entidades (lento, muchas consultas), el adaptador `TypeOrmReportesLecturaAdapter` ejecuta SQL agregado (`SUM`, `COUNT`, `GROUP BY`) directamente sobre las tablas. Es la separación entre el modelo de escritura (cada módulo con sus reglas) y un modelo de lectura optimizado para consultar. Lo único que escribe es su propia tabla `reportes_recompensas`.

```
ReportesController ─▶ caso de uso ─▶ REPORTES_LECTURA (puerto) ─▶ TypeOrmReportesLecturaAdapter ─▶ SQL agregado
                                └─▶ ExportarReporteUseCase ─▶ aCsv() (dominio)  |  REPORTE_PDF ─▶ PDFKit
```

## Caso: reporte mensual de recompensas por mar

1. `periodo` (`YYYY-MM`, opcional; por defecto el mes en curso, en hora de Colombia).
2. `fechaDeCorte()`: fin del mes, o _ahora_ si el mes está en curso. Un mes futuro → 400 `PERIODO_FUTURO`.
3. Se suma, por mar, la recompensa **vigente en la fecha de corte** de cada criminal **ACTIVO**. Se reconstruye desde la tabla histórica `recompensas` (`vigente_desde` / `vigente_hasta`): el reporte de un mes pasado da lo que valían las recompensas **ese** mes, no hoy. Si hubiera dos recompensas solapadas, se toma la más reciente (`ROW_NUMBER`), así nunca se cuenta doble.
4. **Siempre salen los 5 mares** (East, North, South, West Blue y Grand Line), aunque estén en cero.
5. Cada generación guarda o actualiza la instantánea del periodo en `reportes_recompensas`.

```json
GET /api/v1/reportes/recompensas-por-mar?periodo=2026-11
{ "success": true, "data": {
  "periodo": "2026-11", "fechaCorte": "2026-11-12T01:15:37.038Z",
  "filas": [ { "marNombre": "East Blue", "tipoMar": "CUATRO_MARES", "totalAcumulado": 66000000, "cantidadCriminales": 1 },
             …, { "marNombre": "Grand Line", "tipoMar": "GRAND_LINE", "totalAcumulado": 10572000000, "cantidadCriminales": 5 } ],
  "totalGeneral": 11264000000 } }
```

## Caso: tendencias

Por cada grupo: total de criminales, activos, capturados, muertos, recompensa activa y **avistamientos de los últimos 90 días** (la actividad reciente, que es lo que indica la tendencia).

- `agrupar=zona` → zona + su mar.
- `agrupar=afiliacion` → categoría (PIRATA / REVOLUCIONARIO / CRIMINAL_INDEPENDIENTE / SIN_AFILIACION) + organización.
- `agrupar=nivel` → ALTO, MEDIO, BAJO, PENDIENTE.

## Caso: estadísticas para gráficos

Devuelve un `resumen` (activos, capturados, muertos, recompensa total, reportes pendientes, avistamientos por verificar, recompensas por validar) y series con forma `[{ etiqueta, valor }]`: por nivel de amenaza, por mar, por categoría, por estado y avistamientos por mes de los últimos 6 meses. **Todas las categorías aparecen aunque valgan cero**, para que el gráfico no cambie de forma.

## Exportación

- **CSV:** UTF-8 con BOM y separador `;` para que Excel en español (Colombia) lo abra bien, con tildes. Los montos van como números enteros para poder sumarlos.
- **PDF:** A4 horizontal, encabezado de color, filas alternas, fila de totales y salto de página automático.
- Los tres reportes se convierten en una `TablaReporte` genérica (`application/tablas-reporte.ts`), así el mismo exportador sirve para todos.

## Rendimiento (RNF de 3 segundos)

Medido con la base del seed (MariaDB 10.11): JSON de 3 a 10 ms, CSV de 4 a 5 ms y PDF de 17 a 31 ms. Cada reporte es **una** consulta agregada y las seis de estadísticas corren en paralelo. Hay índices en `criminales(estado, nivel_amenaza)`, `criminales(zona_influencia_id)`, `recompensas(criminal_id, estado)` y `avistamientos(criminal_id, fecha_hora)`.

## Errores

| Situación                      | HTTP | Código                            |
| ------------------------------ | ---- | --------------------------------- |
| `periodo` con formato inválido | 400  | `HTTP` (DTO) / `PERIODO_INVALIDO` |
| Mes futuro                     | 400  | `PERIODO_FUTURO`                  |
| Rol sin `REPORTES_LEER`        | 403  | `HTTP`                            |

## Pruebas

`domain/periodo-y-csv.spec.ts` (zona horaria de los periodos, cortes, formato CSV), `application/reportes.use-cases.spec.ts`, `infrastructure/pdfkit-reporte.exportador.spec.ts`.
