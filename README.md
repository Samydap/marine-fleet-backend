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
npm run migration:run    # crea las tablas de RF-4 y RF-6 (no existen en schema.sql)
npm run seed             # siembra los 7 roles con su matriz de permisos + 1 usuario por rol
npm run start:dev
```

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs` ← **el contrato que consume el frontend**

Usuarios de prueba del seed: `<codigo_rol>@marina.gov` / `Marina.2026`
(por ejemplo `almirante@marina.gov`, `director_inteligencia@marina.gov`).

## Qué hay implementado y qué no

| Zona                            | Estado                                                                                                                    | Dueño                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `config/`, `common/`, `shared/` | **Completo**: guards RBAC, interceptores, filtro de excepciones, paginación, errores de dominio, storage                  | Dev 1                               |
| `modules/criminales` (RF-1)     | **Slice vertical de referencia**: entidades, puerto, 4 casos de uso, adaptador TypeORM, controller, DTOs, mapper, pruebas | Dev 2                               |
| `modules/amenaza` (RF-5)        | Motor de clasificación implementado y probado; falta la capa de aplicación                                                | Dev 3                               |
| `modules/auth` (RF-7)           | Estrategia JWT y hasher listos; faltan los casos de uso y el controller                                                   | Dev 1                               |
| Resto de módulos                | Entidades, enums y puertos definidos; capa de aplicación pendiente                                                        | ver tabla en `docs/ARQUITECTURA.md` |

Cada `*.module.ts` lleva en su cabecera la lista de archivos pendientes de su sprint. Es el
punto de partida de su dueño.

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
