# Módulo Catálogos (mares, zonas de influencia, bases navales)

**Carpeta:** `src/modules/catalogos/` · **Clases del diagrama:** `BaseNaval`, enum `Mar` · **Tablas:** `mares`, `zonas_influencia`, `bases_navales`

## Por qué este módulo no tiene casos de uso ni puertos

Es CRUD sin reglas de negocio. Aplicarle arquitectura hexagonal sería ceremonia sin retorno, así que usa una **capa delgada** a propósito (ADR 0001): `controller → service → repositorio TypeORM`. La asimetría con los otros módulos está documentada para que no se discuta en cada PR.

Nada se borra: se **desactiva** (`activo = false` en mares y zonas, `estado = INACTIVA` en bases) para no romper el historial que los referencia.

## Lecturas (cualquier usuario autenticado)

| Endpoint                                                | Uso                                                     |
| ------------------------------------------------------- | ------------------------------------------------------- |
| `GET /api/v1/catalogos/mares`                           | mares activos (East/West/North/South Blue y Grand Line) |
| `GET /api/v1/catalogos/zonas-influencia?marId=`         | zonas, filtrables por mar                               |
| `GET /api/v1/catalogos/bases-navales?zonaInfluenciaId=` | bases activas                                           |
| `GET /api/v1/catalogos/bases-navales/:id`               | detalle: usuarios asignados y operativos activos        |

## CU-CA-01 Administrar mares y zonas de influencia

- **RF:** "administrar el catálogo de mares y zonas de influencia (Cuatro Mares, Grand Line) para su uso en filtros, reportes y operativos."
- **Endpoints** (permiso `CATALOGOS_ADMINISTRAR`, Almirante y Coordinador de Operaciones):
  - `POST /api/v1/catalogos/mares` · `{ "id": "m-calm-belt", "nombre": "Calm Belt", "tipo": "GRAND_LINE" }`
  - `PATCH /api/v1/catalogos/mares/:id` · `{ "activo": false }`
  - `POST /api/v1/catalogos/zonas-influencia` · `{ "marId": "m-grand-line", "nombre": "Skypiea" }`
  - `PATCH /api/v1/catalogos/zonas-influencia/:id`
- **Validación:** la zona debe pertenecer a un mar existente (404 si no). El `id` es opcional: legible (`z-skypiea`) o UUID automático.
- **Por qué importa el tipo de mar:** el motor de amenaza (RF-5) escala el nivel de los criminales que operan en `GRAND_LINE` (lo lee con `CatalogosService.obtenerContextoZona`).

## CU-CA-02 Registrar bases navales

- **RF:** "registrar las bases navales existentes, incluyendo su ubicación, zona de influencia marina y comandante a cargo."
- **Endpoints:**
  - `POST /api/v1/catalogos/bases-navales` · `{ "nombre": "Base G-8", "zonaInfluenciaId": "z-sabaody", "ubicacion": "Isla Navarone", "comandanteNombre": "Vicealmirante Jonathan" }`
  - `PATCH /api/v1/catalogos/bases-navales/:id` · `{ "estado": "INACTIVA", "version": 1 }`
- **Validación:** la zona debe existir y estar activa. Si se envía `version` y no coincide → 409 (concurrencia optimista).
- La asignación de usuarios a una base la hace el módulo Usuarios (`usuarios.base_naval_id`); aquí solo se consulta.
