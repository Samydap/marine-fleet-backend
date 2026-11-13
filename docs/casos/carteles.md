# Módulo Carteles (RF-2): generación automática de carteles WANTED

**Carpeta:** `src/modules/carteles/` · **Clase del diagrama:** `CartelWanted` · **Tabla:** `carteles`

## Qué resuelve

| Requerimiento                                                                                                                           | Cómo se cumple                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "El sistema debe generar automáticamente un cartel de búsqueda (wanted poster) al registrar o actualizar un criminal."                  | Un _oyente de eventos_ (`CriminalActualizadoListener`) genera el cartel cuando Criminales publica `criminal.registrado`. No hay que pulsar ningún botón.                    |
| "El sistema debe actualizar automáticamente el cartel de búsqueda cuando cambie la foto, recompensa, estado o afiliación del criminal." | El mismo oyente escucha `criminal.actualizado` (motivos FOTO, RECOMPENSA, AFILIACION), `criminal.estado-cambiado` y `amenaza.reclasificada`, y emite una **versión nueva**. |
| "El sistema debe permitir descargar, imprimir o exportar el cartel de búsqueda en formato PDF o imagen."                                | `GET /carteles/:id/descargar?formato=pdf` (para imprimir) y `?formato=svg` (imagen).                                                                                        |

## Idea central: carteles versionados con instantánea

Un cartel impreso no cambia aunque la recompensa suba después. Por eso cada cartel es una **versión** (`numero_version`) que guarda una **foto de los datos** del criminal en `datos_instantanea` (JSON). Solo una versión está `vigente` por criminal; las anteriores quedan como historial.

```
v1 REGISTRO          30.000.000 B   vigente = 0
v2 CAMBIO_RECOMPENSA 3.000.000.000  vigente = 0
v3 CAMBIO_ESTADO     CAPTURADO      vigente = 1   ← la que se muestra hoy
```

## Flujo automático (el caso principal)

```
Criminales/Recompensas/Amenaza ──evento──▶ CriminalActualizadoListener (infrastructure/listeners)
                                             │ traduce el evento a un MotivoGeneracion
                                             ▼
                                   RegenerarPorCambioUseCase
                                             │ ¿el motivo obliga versión nueva? (politica-versionado.ts)
                                             ▼
                                   GenerarCartelUseCase
                                             │ 1. CRIMINAL_READER.obtenerResumen(id)   (puerto de solo lectura)
                                             │ 2. construirInstantanea()               (dominio, función pura)
                                             │ 3. ¿igual a la vigente? → no hace nada  (idempotencia)
                                             │ 4. CARTEL_RENDERER.renderizar(pdf)      (PDFKit)
                                             │ 5. STORAGE_PORT.guardar(carteles/<id>/v<n>.pdf)
                                             │ 6. CARTEL_REPOSITORY.guardarNuevaVersion (transacción:
                                             │    la anterior pasa a vigente = 0)
                                             ▼ 7. emite cartel.generado
```

| Evento escuchado                                                 | Motivo de la versión                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `criminal.registrado`                                            | `REGISTRO`                                                 |
| `criminal.estado-cambiado`                                       | `CAMBIO_ESTADO` (el PDF lleva sello CAPTURADO / FALLECIDO) |
| `criminal.actualizado` con motivo RECOMPENSA / FOTO / AFILIACION | `CAMBIO_RECOMPENSA` / `CAMBIO_FOTO` / `CAMBIO_AFILIACION`  |
| `criminal.actualizado` con motivo DATOS o ZONA                   | ninguno: no cambia lo que se imprime                       |
| `amenaza.reclasificada`                                          | `CAMBIO_RECOMPENSA` (el nivel de amenaza va impreso)       |

**Reglas importantes**

- **Idempotencia:** si la instantánea nueva es igual a la vigente (nombre, alias, recompensa, nivel, estado, organización, foto), no se crea versión. Así, que un cambio de recompensa dispare dos eventos (recompensa y reclasificación) no produce dos carteles iguales.
- **Sin choques de versión:** `ColaPorClave` ejecuta en fila las generaciones del _mismo_ criminal; las de criminales distintos corren en paralelo. Está probado con dos eventos simultáneos.
- **Un fallo no rompe al que lo originó:** si el PDF falla, el oyente lo registra en el log y el registro del criminal se completa igual.
- **Carteles no conoce a Criminales:** solo lee por `CRIMINAL_READER` y escucha eventos. Es la inversión de dependencias en práctica.

## Endpoints

| Método y ruta                                           | Permiso            | Qué hace                                                                       |
| ------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------ |
| `GET /api/v1/carteles/criminal/:criminalId`             | `CRIMINALES_LEER`  | Cartel vigente                                                                 |
| `GET /api/v1/carteles/criminal/:criminalId/versiones`   | `CRIMINALES_LEER`  | Historial de versiones                                                         |
| `GET /api/v1/carteles/:id/descargar?formato=pdf\|svg`   | `CRIMINALES_LEER`  | Descarga PDF o imagen (adjunto)                                                |
| `POST /api/v1/carteles/criminal/:criminalId/generar`    | `CARTELES_GENERAR` | Versión manual (motivo `MANUAL`, siempre crea)                                 |
| `POST /api/v1/carteles/regenerar-todos`                 | `CARTELES_GENERAR` | Genera el cartel inicial de los criminales que no tienen (p. ej. los del seed) |
| `GET /api/v1/archivos/carteles/*` y `/archivos/fotos/*` | **público**        | Sirve el archivo guardado (un `<img>` no puede mandar token)                   |
| `GET /api/v1/archivos/*` (otras carpetas)               | sesión             | Cualquier otro archivo del almacenamiento                                      |

Ejemplo de respuesta de `GET /carteles/criminal/c-luffy`:

```json
{
  "success": true,
  "data": {
    "id": "8fbe63c2-…",
    "criminalId": "c-luffy",
    "numeroVersion": 1,
    "vigente": true,
    "motivoGeneracion": "REGISTRO",
    "archivoUrl": "/api/v1/archivos/carteles/c-luffy/v1.pdf",
    "descargas": {
      "pdf": "/api/v1/carteles/8fbe…/descargar?formato=pdf",
      "imagen": "/api/v1/carteles/8fbe…/descargar?formato=svg"
    },
    "datos": {
      "nombre": "Monkey D. Luffy",
      "recompensa": 3000000000,
      "nivelAmenaza": "ALTO",
      "estado": "ACTIVO"
    }
  }
}
```

## Formatos

- **PDF (A4):** `PdfkitCartelRenderer`. Título WANTED / SE BUSCA, recuadro de foto (PNG/JPEG si existe en el almacenamiento; si no, "SIN FOTOGRAFIA"), DEAD OR ALIVE, nombre, alias, recompensa en berries con separador de miles, nivel de amenaza con color, organización y su categoría, texto legal y sello rojo si está CAPTURADO o MUERTO.
- **Imagen (SVG):** `SvgCartelRenderer`, misma plantilla (`templates/wanted-poster.template.ts`) y mismos textos; se dibuja al vuelo desde la instantánea de esa versión, así siempre coincide con su PDF.
- Los dos implementan el puerto `CARTEL_RENDERER`: cambiar PDFKit por otro motor no toca los casos de uso.

## Errores

| Situación                       | HTTP    | Código          |
| ------------------------------- | ------- | --------------- |
| Criminal sin cartel todavía     | 404     | `NO_ENCONTRADO` |
| Criminal inexistente al generar | 404     | `NO_ENCONTRADO` |
| `formato` distinto de pdf/svg   | 400     | `HTTP`          |
| Ruta de archivo con `..`        | 400/404 | `RUTA_INVALIDA` |

## Pruebas

`application/generar-cartel.use-case.spec.ts` (versión 1, idempotencia, versión 2, forzado manual, concurrencia, criminal inexistente), `application/otros-casos-carteles.spec.ts`, `infrastructure/renderers.spec.ts` (PDF válido, SVG con escape de caracteres y sello).
