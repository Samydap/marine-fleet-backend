# marine-fleet-backend

API del Sistema de Gestión de Recompensas y Captura de Criminales de la Marina (Caso 13).
NestJS + TypeScript + TypeORM + MySQL, con Clean Architecture por módulo.

> **¿Solo quieres ejecutar el proyecto?** Sigue la [guía de ejecución](docs/EJECUCION.md): tiene
> el paso a paso completo, desde la base de datos hasta abrir la página en el navegador.

> La arquitectura completa, la matriz de los 6 desarrolladores y las políticas de Git están
> en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md), que es el mismo documento que está en el
> repo del frontend: si lo cambias, actualiza las dos copias. Las decisiones puntuales con su
> razonamiento y su costo están en [`docs/adr/`](docs/adr).

## Arranque

```bash
npm install
cp .env.example .env     # en PowerShell: Copy-Item .env.example .env
```

Edita `.env` con tus credenciales de MySQL. Si `JWT_SECRET` tiene menos de 32 caracteres, la
app no arranca: la validación de entorno es intencionalmente estricta.

```bash
npm run migration:run    # crea TODAS las tablas y los triggers (ya no hace falta schema.sql)
npm run seed             # roles, 1 usuario por rol, mares, bases, organizaciones, criminales...
npm run start:dev
```

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs` ← **el contrato que consume el frontend**

Usuarios de prueba del seed: `<codigo_rol>@marina.gov` / `Marina.2026`
(por ejemplo `almirante@marina.gov`, `director_inteligencia@marina.gov`).

## Qué hay implementado

**Todos los módulos están completos** (RF-1 a RF-7 + RNF del documento IEEE): casos de uso,
puertos, adaptadores TypeORM, controllers con RBAC, DTOs validados y pruebas unitarias.

> **¿Cómo funciona cada caso de uso?** Lee [`docs/CASOS-DE-USO.md`](docs/CASOS-DE-USO.md): el
> recorrido de una petición, el mapa de eventos entre módulos, la trazabilidad
> requerimiento → endpoint y el detalle por módulo en [`docs/casos/`](docs/casos).

| Módulo                          | Qué cubre                                                                  |
| ------------------------------- | -------------------------------------------------------------------------- |
| `criminales`                    | Criminales, foto, afiliaciones, organizaciones, antecedentes, historial    |
| `recompensas`                   | Solicitud, validación del Almirante, historial inmutable                   |
| `amenaza`                       | Clasificación automática, criterios (solo Analista), análisis de riesgo    |
| `carteles`                      | Wanted automático y versionado en PDF / SVG, descarga de archivos          |
| `inteligencia`                  | Avistamientos, reportes ciudadanos públicos con revisión                   |
| `operativos`                    | Operativos, bases, recursos, responsables, estados, cierre                 |
| `incidentes`                    | Enfrentamientos, vínculo a operativo, cierre con desenlaces, historiales   |
| `reportes`                      | Reporte mensual por mar, tendencias, estadísticas, exportación PDF / CSV   |
| `sincronizacion`                | Tiempo real por SSE, polling de respaldo, notificaciones a bases, `/salud` |
| `catalogos`                     | Mares, zonas y bases navales (lectura y administración)                    |
| `auth`, `usuarios`, `auditoria` | Login, refresh, cuentas con rol y base, bitácora consultable               |

Pendiente opcional (no lo exige el documento): segundo factor TOTP (`auth/domain/mfa-provider.port.ts`).

Prueba de punta a punta contra la API real: `bash scripts/flujo-demo.sh`.

## Cómo agregar un caso de uso (copia el slice de referencia)

1. `domain/` — si hay regla nueva, va aquí primero, como función o método de entidad.
2. `application/mi-accion.use-case.ts` — una clase, un `execute`, depende de un **puerto**.
3. `application/mi-accion.use-case.spec.ts` — con un doble en memoria, sin base de datos.
4. `infrastructure/` — solo si necesitas una consulta nueva.
5. `presentation/dto/` — validación con `class-validator`.
6. `presentation/*.controller.ts` — un endpoint delgado con `@RequierePermisos` y `@Audit`.
7. Regístralo en tu `*.module.ts`. **No toques `app.module.ts`**: ya está declarado.

Referencias para copiar:
`modules/criminales/application/registrar-criminal.use-case.ts` y su `.spec.ts`.

## Reglas que el linter hace cumplir (no son sugerencias)

- `domain/` no puede importar NestJS, TypeORM ni `infrastructure/`.
- `application/` no puede importar `infrastructure/`: usa el puerto.
- `presentation/` no puede importar `infrastructure/`: invoca casos de uso.
- Sin `any`, sin `console.log`, sin promesas sin `await`.
- Máximo 300 líneas por archivo (las entidades y migraciones están exentas).

Si el lint falla por un límite de capa, el problema es el import, no la regla.

**Única excepción, deliberada:** los archivos `*.entity.ts` dentro de `domain/` sí pueden
importar `typeorm`, porque el modelo es de dominio anotado para persistencia y no un modelo
puro con entidades espejo en `infrastructure/`. El razonamiento y su costo están en
`docs/adr/0002-typeorm-sobre-prisma.md`. En esos archivos siguen prohibidos `mysql2`, NestJS,
`infrastructure/` y `presentation/`; y en el resto de `domain/` TypeORM está prohibido sin
excepción.

## Convenciones de commit

`<tipo>(<alcance>): <descripción en imperativo y minúscula>`

Alcances válidos: `auth`, `usuarios`, `criminales`, `recompensas`, `amenaza`, `carteles`,
`inteligencia`, `operativos`, `incidentes`, `catalogos`, `core`, `shared`, `config`, `ci`, `deps`.

```
feat(criminales): registrar criminal con afiliacion a organizacion
fix(inteligencia): validar formato de fecha_hora en avistamientos
```

El hook `commit-msg` rechaza lo que no cumpla. El CI lo revalida en el PR.

## Scripts

| Comando                                    | Qué hace                                        |
| ------------------------------------------ | ----------------------------------------------- |
| `npm run start:dev`                        | API en watch mode                               |
| `npm run lint`                             | ESLint con `--max-warnings 0` (igual que el CI) |
| `npm test`                                 | Pruebas unitarias                               |
| `npm run migration:create --name=MiCambio` | Crea una migración vacía                        |
| `npm run migration:run` / `:revert`        | Aplica / revierte migraciones                   |
| `npm run seed`                             | Siembra roles y usuarios de prueba              |

**Nunca** pongas `synchronize: true` en `config/database.config.ts`: TypeORM alteraría el
esquema real y destruiría el trigger `trg_criminales_historial_update`.

**Nunca** edites una migración ya mergeada en `develop`. Se corrige con una migración nueva.
