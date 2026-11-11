# Caso 13 — Arquitectura y Estrategia de Trabajo Colaborativo

**Sistema de Gestión de Recompensas y Captura de Criminales de la Marina**
Documento de arquitectura y convenciones de equipo · Stack: TypeScript fullstack · Equipo: 6 desarrolladores · Metodología: Scrum

> **Documento compartido.** Este archivo existe por duplicado, igual, en `marine-fleet-backend/docs/` y en `marine-fleet-frontend/docs/`, para que cada repositorio sea autocontenido. **Si lo modificas, abre el cambio en los dos repos**; si no, las dos copias divergen y nadie sabe cuál manda. Cualquier cambio a este documento pasa por el Lead Técnico (`CODEOWNERS` cubre `/docs/`).

---

## 0. Punto de partida y decisión de migración

| Dimensión           | Estado actual (este repo)                                          | Estado objetivo                                                         |
| ------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Repositorios        | 1 monorepo informal (`backend/`, `frontend/`, `database/`)         | 2 repos independientes: `marine-fleet-backend`, `marine-fleet-frontend` |
| Backend             | Express + `mysql2` crudo, **todo en `src/server.ts` (291 líneas)** | NestJS modular + Clean Architecture por módulo                          |
| Frontend            | React 18 + Vite, **todo en `src/App.tsx` (395 líneas)**            | React + Vite con arquitectura feature-based y un chunk por página       |
| Cobertura funcional | Solo RF-3 parcial (CRUD de avistamientos)                          | RF-1 a RF-7                                                             |
| Autenticación       | Inexistente                                                        | JWT + RBAC + MFA opcional (el esquema ya lo prevé)                      |

> **Qué se conserva de la v1 y qué no.** El framework del frontend **no cambia**: la v1 es React y la v2 sigue en React, así que el equipo se queda en lo que ya conoce y el módulo que funcionaba se porta en lugar de reescribirse. Lo que cambia es dónde vive cada cosa: el `App.tsx` de 395 líneas se reparte entre `features/inteligencia/` (la pantalla), `core/http/` (las llamadas) y `shared/utils/fecha.ts` (las funciones de fecha, que ahora además tienen pruebas).
>
> También se conserva el esquema SQL (`database/schema.sql`), que está bien modelado y es la base del dominio, y el CSS de la v1, que es el diseño que el equipo ya había hecho. La lógica de validación de `server.ts` (`parseFechaHora`, validaciones de entrada) se traduce a DTOs con `class-validator` en el backend; no se tira.
>
> **Lo que sí se pierde temporalmente:** el CRUD de avistamientos de la v1 apuntaba a la API vieja (`/api/avistamientos`). Al portarlo al contrato nuevo (`/api/v1/avistamientos`), la pantalla compila y se renderiza pero no tiene backend hasta que Dev 5 implemente el módulo `inteligencia` en el Sprint 1. Es una decisión consciente, no un olvido: el alternativo era arrastrar el contrato viejo a la v2.

> **Hueco detectado en el esquema:** `schema.sql` **no tiene tablas para RF-4 (coordinación de operativos) ni para RF-6 (historial de incidentes y enfrentamientos)**. Solo existe `criminales_historial`, que es un log de cambios de atributos generado por trigger, no un historial de enfrentamientos. Esas tablas (`operativos`, `operativo_bases`, `incidentes`, `incidente_participantes`) deben crearse como migración al inicio del Sprint 1, antes de que los devs de esos módulos puedan avanzar. Está contemplado en la matriz de asignación.

---

## 1. Selección y Justificación del Patrón Arquitectónico

### 1.1 Backend — NestJS modular + Clean Architecture por capas dentro de cada módulo

**Decisión:** NestJS como framework, con **un módulo por bounded context** y, dentro de cada módulo, cuatro capas (`domain`, `application`, `infrastructure`, `presentation`). Hexagonal **pragmática**: puertos e inversión de dependencias donde hay regla de negocio real, capa delgada donde solo hay CRUD.

**Por qué NestJS modular y no Express por capas:**

1. **El módulo es la unidad de paralelización.** Cada RF se mapea a una carpeta `src/modules/<x>/` con dueño único. Seis desarrolladores trabajan sobre seis carpetas disjuntas y el área de colisión de un merge se reduce a los archivos de registro (`app.module.ts`), en lugar de a un `server.ts` compartido. El estado actual del proyecto es la demostración del problema: con un único `server.ts`, **cualquier** par de desarrolladores que trabaje a la vez colisiona.
2. **Inyección de dependencias nativa.** El dev de Carteles (RF-2) necesita datos de Criminales (RF-1), que todavía no existe. Con DI inyecta el _puerto_ `CriminalReaderPort` y lo sustituye por un stub en sus pruebas. **Nadie queda bloqueado esperando el módulo de otro.**
3. **Contratos antes de implementación.** Los DTOs y las interfaces de puerto se definen y se mergean a `develop` en los primeros dos días del sprint. Desde ahí, backend y frontend avanzan contra un contrato estable y contra el `openapi.json` que Nest genera con Swagger.
4. **RBAC transversal resuelto una sola vez.** Un `RolesGuard` global más un decorador `@Roles('ALMIRANTE')` cubre los siete módulos. En Express, cada dev reimplementaría su propio middleware de permisos, distinto y peor.
5. **Estructura impuesta, no negociada.** El Nest CLI genera la misma forma para todos. Con seis estudiantes, la convención automática vale más que la convención documentada.

**Las cuatro capas y qué va en cada una:**

| Capa              | Contenido                                                                              | Depende de              | Regla                                             |
| ----------------- | -------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------- |
| `domain/`         | Entidades, value objects (`Bounty`, `ThreatLevel`), reglas puras, interfaces de puerto | Nada                    | Cero imports de NestJS, TypeORM o Express         |
| `application/`    | Casos de uso (un archivo = un caso de uso), orquestación, transacciones                | `domain`                | Solo conoce puertos, nunca repositorios concretos |
| `infrastructure/` | Adaptadores: repositorios TypeORM, generador de PDF, almacenamiento de archivos        | `domain`, `application` | Implementa los puertos del dominio                |
| `presentation/`   | Controllers, DTOs de request/response, mappers, guards específicos                     | `application`           | Nunca toca `infrastructure` directamente          |

**Dónde aplicar hexagonal estricta y dónde no:**

- **Estricta** (puerto + adaptador + casos de uso aislados): `criminales`, `recompensas`, `amenaza`, `carteles`, `operativos`. Tienen reglas de negocio reales: validación de recompensa según rol, clasificación automática por bounty y zona, versionado de carteles, concurrencia optimista con la columna `version`.
- **Delgada** (controller → service → repositorio, sin puertos): `catalogos` (mares, zonas de influencia, bases navales). Es CRUD de lectura; ponerle hexagonal es ceremonia sin retorno.

Documentar esta asimetría por escrito evita la discusión semanal de "¿por qué aquí sí y allá no?".

**ORM: TypeORM, no Prisma.** Prisma tiene mejor DX, pero concentra todo el modelo en un único `schema.prisma`: con 6 devs tocando entidades en paralelo, ese archivo se convierte en el nuevo `server.ts`. TypeORM distribuye **una entidad por archivo dentro del módulo de su dueño** y genera **una migración por archivo con timestamp**: dos propiedades que eliminan conflictos estructurales. Configuración obligatoria: `synchronize: false` siempre. El esquema vive en migraciones versionadas, nunca en autogeneración.

### 1.2 Frontend — React feature-based con rutas y chunks por feature

**Decisión:** tres zonas (`core/`, `shared/`, `features/`) con una regla de dependencia unidireccional, y **un archivo de rutas propio por feature** cuyas páginas se cargan con `React.lazy`.

> **Nota de historia:** la primera versión de este documento diseñó esta capa sobre Angular, porque así se pidió. Al revisar el costo real se cambió a React, que es el framework de la v1 del sistema: mantiene al equipo en lo que ya conoce y permite reutilizar el módulo de avistamientos que ya funcionaba. Las decisiones de arquitectura de esta sección no cambiaron con el framework — no eran angular-específicas—, solo su traducción técnica.

**Cómo se aísla cada feature en la práctica:**

1. **Un `*.routes.tsx` por feature.** Cada feature exporta su propio arreglo de `RouteObject` y `app/routes.tsx` solo lo referencia con una línea. Un dev que agrega tres pantallas toca **su** archivo de rutas; el archivo raíz cambia una vez por feature en todo el proyecto, no una vez por pantalla. Esto es lo que elimina los conflictos.
2. **`React.lazy` por página.** Cada página es su propio chunk: el bundle de Carteles no se descarga si el usuario entra a Avistamientos. Verificado en el build — hay un chunk por página, no uno monolítico.
3. **`data-access/` por feature.** El módulo HTTP de una feature vive dentro de la feature. Nada de un `api.ts` global con 40 métodos: eso acopla a todos con todos y es conflicto garantizado.
4. **Comunicación entre features solo por contrato.** Si Operativos necesita mostrar criminales, consume el endpoint del backend o un servicio de `core/`; nunca importa `features/criminales/...`. Lo verifica ESLint, no la confianza, y está comprobado con pruebas negativas.
5. **Estado:** un store por feature con **Zustand** (3 kB, un archivo por store). Es el equivalente directo del store por feature que tendría Angular con signals. Se descartó Redux/NgRx por el mismo motivo en ambos frameworks: añade cuatro archivos compartidos por acción, todos focos de merge. Se descartó TanStack Query por ahora para no sumar conceptos (queryKeys, invalidación) a seis juniors en el primer sprint; **cuándo añadirlo:** si aparece necesidad real de caché compartida entre pantallas o refetch en background.

**Guards y RBAC en frontend:** `RequireAuth` (sesión) y `RequirePermiso` (permiso) viven en `core/guards/` y se usan como `element` de la ruta padre en el `*.routes.tsx` de cada feature. Al envolver la ruta, el chunk del hijo **no se descarga** si no hay permiso: es la propiedad útil que tenía `canMatch` en Angular y aquí se conserva. El frontend oculta, el backend decide: todo guard de UI tiene su contraparte obligatoria en el `RolesGuard` del backend.

**Los interceptores HTTP se construyen, no vienen dados.** React no trae el equivalente de `HttpInterceptorFn`, así que `core/http/` define una cadena componible sobre `fetch` (`Peticion`, `Siguiente`, `Interceptor` y una función `componer`). Son cuatro archivos —URL base, token, indicador de carga y mapeo de errores— compuestos en `api-client.ts`. Se mantiene la propiedad que importaba: cada responsabilidad transversal en su propio archivo, y ninguna feature reimplementando headers, errores ni spinner.

---

## 2. Estructura Completa de Carpetas

### 2.1 `marine-fleet-backend/`

```
marine-fleet-backend/
├── .github/
│   └── workflows/
│       └── ci.yml                        # lint + test + build en cada PR
├── docs/
│   ├── ARQUITECTURA.md
│   ├── CONTRATOS-API.md                  # contratos acordados día 1-2 del sprint
│   └── adr/                              # Architecture Decision Records
│       ├── 0001-nestjs-modular.md
│       └── 0002-typeorm-sobre-prisma.md
├── src/
│   ├── main.ts                           # bootstrap, Swagger, pipes globales
│   ├── app.module.ts                     # ÚNICO punto compartido: registra los módulos
│   │
│   ├── config/                           # DUEÑO: Dev 1 (Platform)
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── env.validation.ts             # validación de .env con Joi/zod al arrancar
│   │
│   ├── shared/                           # DUEÑO: Dev 1 — cambios vía PR con 2 reviewers
│   │   ├── domain/
│   │   │   ├── base.entity.ts            # id, version, created_at, updated_at
│   │   │   ├── value-objects/
│   │   │   │   ├── uuid.vo.ts
│   │   │   │   └── bounty.vo.ts          # monto + moneda BERRIES, invariante >= 0
│   │   │   ├── errors/
│   │   │   │   ├── domain.error.ts
│   │   │   │   ├── not-found.error.ts
│   │   │   │   └── concurrency.error.ts  # choque de columna `version`
│   │   │   └── events/
│   │   │       └── domain-event.ts
│   │   ├── application/
│   │   │   ├── use-case.interface.ts
│   │   │   └── pagination/
│   │   │       ├── page-query.dto.ts
│   │   │       └── page-result.ts
│   │   └── infrastructure/
│   │       ├── database/
│   │       │   ├── data-source.ts        # DataSource de TypeORM para CLI/migraciones
│   │       │   ├── migrations/           # 1 archivo por migración, nombre con timestamp
│   │       │   │   ├── 1731200000000-InitSchema.ts
│   │       │   │   ├── 1731200100000-CreateOperativos.ts
│   │       │   │   └── 1731200200000-CreateIncidentes.ts
│   │       │   └── seeds/
│   │       │       └── one-piece.seed.ts # datos de prueba del universo
│   │       ├── logging/
│   │       │   └── logger.service.ts
│   │       └── storage/
│   │           ├── storage.port.ts       # puerto de almacenamiento de archivos
│   │           └── local-storage.adapter.ts
│   │
│   ├── common/                           # DUEÑO: Dev 1 — transversales de HTTP
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts        # @Roles('ALMIRANTE', 'DIR_INTELIGENCIA')
│   │   │   ├── current-user.decorator.ts
│   │   │   └── audit.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts         # autenticación  (registrado global)
│   │   │   ├── roles.guard.ts            # RBAC           (registrado global)
│   │   │   └── base-scope.guard.ts       # un capitán solo ve su base naval
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── audit.interceptor.ts      # bitácora: quién hizo qué, exigido por RF-7
│   │   │   └── transform-response.interceptor.ts
│   │   ├── filters/
│   │   │   └── all-exceptions.filter.ts  # DomainError -> 4xx, resto -> 500
│   │   └── pipes/
│   │       └── parse-uuid.pipe.ts
│   │
│   └── modules/                          # ZONA DE TRABAJO PARALELO: 1 carpeta = 1 dueño
│       │
│       ├── auth/                         # RF-7 · DUEÑO: Dev 1
│       │   ├── auth.module.ts
│       │   ├── domain/
│       │   │   ├── session.entity.ts
│       │   │   ├── password-hasher.port.ts
│       │   │   └── mfa-provider.port.ts
│       │   ├── application/
│       │   │   ├── login.use-case.ts
│       │   │   ├── refresh-token.use-case.ts
│       │   │   ├── verify-mfa.use-case.ts
│       │   │   └── lock-account.use-case.ts   # intentos_fallidos del esquema
│       │   ├── infrastructure/
│       │   │   ├── bcrypt-hasher.adapter.ts
│       │   │   ├── totp-mfa.adapter.ts
│       │   │   └── jwt.strategy.ts
│       │   └── presentation/
│       │       ├── auth.controller.ts
│       │       └── dto/
│       │           ├── login.dto.ts
│       │           └── verify-mfa.dto.ts
│       │
│       ├── usuarios/                     # RF-7 · DUEÑO: Dev 1
│       │   ├── usuarios.module.ts
│       │   ├── domain/
│       │   │   ├── usuario.entity.ts
│       │   │   ├── rol.entity.ts
│       │   │   ├── permiso.enum.ts
│       │   │   └── usuario.repository.port.ts
│       │   ├── application/
│       │   │   ├── crear-usuario.use-case.ts
│       │   │   ├── asignar-rol.use-case.ts
│       │   │   └── listar-usuarios.use-case.ts
│       │   ├── infrastructure/
│       │   │   └── typeorm-usuario.repository.ts
│       │   └── presentation/
│       │       ├── usuarios.controller.ts
│       │       └── dto/
│       │
│       ├── criminales/                   # RF-1 · DUEÑO: Dev 2
│       │   ├── criminales.module.ts
│       │   ├── domain/
│       │   │   ├── criminal.entity.ts
│       │   │   ├── organizacion.entity.ts     # PIRATA | REVOLUCIONARIO | CRIMINAL_INDEPENDIENTE
│       │   │   ├── membresia.entity.ts        # LIDER | OFICIAL | MIEMBRO
│       │   │   ├── antecedente.entity.ts
│       │   │   ├── estado-criminal.enum.ts    # ACTIVO | CAPTURADO | MUERTO
│       │   │   ├── criminal.repository.port.ts
│       │   │   └── services/
│       │   │       └── normalizador-nombre.ts # nombre_normalizado, evita duplicados
│       │   ├── application/
│       │   │   ├── registrar-criminal.use-case.ts
│       │   │   ├── actualizar-criminal.use-case.ts
│       │   │   ├── cambiar-estado-criminal.use-case.ts
│       │   │   ├── afiliar-a-organizacion.use-case.ts
│       │   │   ├── registrar-antecedente.use-case.ts
│       │   │   └── buscar-criminales.use-case.ts
│       │   ├── infrastructure/
│       │   │   ├── typeorm-criminal.repository.ts
│       │   │   └── typeorm-organizacion.repository.ts
│       │   └── presentation/
│       │       ├── criminales.controller.ts
│       │       ├── organizaciones.controller.ts
│       │       ├── dto/
│       │       └── mappers/
│       │
│       ├── recompensas/                  # RF-1/RF-5 · DUEÑO: Dev 3
│       │   ├── recompensas.module.ts
│       │   ├── domain/
│       │   │   ├── recompensa.entity.ts
│       │   │   ├── estado-recompensa.enum.ts  # PENDIENTE_VALIDACION | VIGENTE | HISTORICA | RECHAZADA
│       │   │   ├── politica-validacion.ts     # qué monto exige firma de Almirante
│       │   │   └── recompensa.repository.port.ts
│       │   ├── application/
│       │   │   ├── solicitar-recompensa.use-case.ts
│       │   │   ├── validar-recompensa.use-case.ts
│       │   │   └── historial-recompensas.use-case.ts
│       │   ├── infrastructure/
│       │   └── presentation/
│       │
│       ├── amenaza/                      # RF-5 · DUEÑO: Dev 3
│       │   ├── amenaza.module.ts
│       │   ├── domain/
│       │   │   ├── criterio-amenaza.entity.ts # tabla criterios_amenaza
│       │   │   ├── nivel-amenaza.enum.ts      # BAJO | MEDIO | ALTO | PENDIENTE
│       │   │   └── motor-clasificacion.ts     # REGLA NÚCLEO: bounty + zona -> nivel
│       │   ├── application/
│       │   │   ├── clasificar-criminal.use-case.ts
│       │   │   ├── reclasificar-masivo.use-case.ts
│       │   │   └── actualizar-criterios.use-case.ts
│       │   ├── infrastructure/
│       │   │   └── listeners/
│       │   │       └── recompensa-cambiada.listener.ts  # reclasifica al cambiar bounty
│       │   └── presentation/
│       │
│       ├── carteles/                     # RF-2 · DUEÑO: Dev 4
│       │   ├── carteles.module.ts
│       │   ├── domain/
│       │   │   ├── cartel.entity.ts
│       │   │   ├── motivo-generacion.enum.ts  # REGISTRO | CAMBIO_FOTO | CAMBIO_RECOMPENSA | ...
│       │   │   ├── cartel-renderer.port.ts    # puerto: así el motor de PDF es sustituible
│       │   │   └── politica-versionado.ts     # numero_version + vigente
│       │   ├── application/
│       │   │   ├── generar-cartel.use-case.ts
│       │   │   ├── regenerar-por-cambio.use-case.ts
│       │   │   └── obtener-cartel-vigente.use-case.ts
│       │   ├── infrastructure/
│       │   │   ├── pdfkit-renderer.adapter.ts
│       │   │   ├── templates/
│       │   │   │   └── wanted-poster.template.ts
│       │   │   └── listeners/
│       │   │       └── criminal-actualizado.listener.ts # generación AUTOMÁTICA
│       │   └── presentation/
│       │
│       ├── inteligencia/                 # RF-3 · DUEÑO: Dev 5
│       │   ├── inteligencia.module.ts
│       │   ├── domain/
│       │   │   ├── avistamiento.entity.ts
│       │   │   ├── reporte-ciudadano.entity.ts
│       │   │   ├── nivel-confiabilidad.vo.ts
│       │   │   └── avistamiento.repository.port.ts
│       │   ├── application/
│       │   │   ├── registrar-avistamiento.use-case.ts
│       │   │   ├── registrar-reporte-ciudadano.use-case.ts
│       │   │   ├── revisar-reporte.use-case.ts        # APROBADO -> crea avistamiento
│       │   │   └── consultar-avistamientos.use-case.ts
│       │   ├── infrastructure/
│       │   └── presentation/
│       │
│       ├── operativos/                   # RF-4 · DUEÑO: Dev 6
│       │   ├── operativos.module.ts
│       │   ├── domain/
│       │   │   ├── operativo.entity.ts            # tabla NUEVA (migración Sprint 1)
│       │   │   ├── participacion-base.entity.ts   # tabla NUEVA
│       │   │   ├── estado-operativo.enum.ts       # PLANIFICADO | EN_CURSO | CERRADO | ABORTADO
│       │   │   └── politica-asignacion.ts         # base por zona de influencia del objetivo
│       │   ├── application/
│       │   │   ├── crear-operativo.use-case.ts
│       │   │   ├── asignar-bases.use-case.ts
│       │   │   ├── cambiar-estado-operativo.use-case.ts
│       │   │   └── tablero-operativos.use-case.ts
│       │   ├── infrastructure/
│       │   └── presentation/
│       │
│       ├── incidentes/                   # RF-6 · DUEÑO: Dev 6
│       │   ├── incidentes.module.ts
│       │   ├── domain/
│       │   │   ├── incidente.entity.ts            # tabla NUEVA (migración Sprint 1)
│       │   │   ├── participante.entity.ts         # tabla NUEVA
│       │   │   └── resultado-enfrentamiento.enum.ts
│       │   ├── application/
│       │   │   ├── registrar-incidente.use-case.ts
│       │   │   ├── cerrar-incidente.use-case.ts   # CAPTURADO -> dispara estado y cartel
│       │   │   └── historial-por-criminal.use-case.ts
│       │   ├── infrastructure/
│       │   └── presentation/
│       │
│       └── catalogos/                    # soporte · DUEÑO: Dev 6 (capa delgada)
│           ├── catalogos.module.ts
│           ├── entities/
│           │   ├── mar.entity.ts
│           │   ├── zona-influencia.entity.ts
│           │   └── base-naval.entity.ts
│           ├── catalogos.service.ts
│           └── catalogos.controller.ts
│
├── test/
│   ├── unit/                             # espejo de src/, dominio y casos de uso
│   └── e2e/
│       └── <modulo>.e2e-spec.ts          # 1 archivo por módulo, sin colisiones
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── .editorconfig
├── commitlint.config.cjs
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── package.json
└── README.md
```

**Mapa de responsabilidades en el backend (respuesta directa a "dónde va cada cosa"):**

| Elemento              | Ubicación                                                |
| --------------------- | -------------------------------------------------------- |
| Controladores / rutas | `modules/<x>/presentation/*.controller.ts`               |
| Casos de uso          | `modules/<x>/application/*.use-case.ts`                  |
| Dominio / modelos     | `modules/<x>/domain/*.entity.ts`, `*.vo.ts`, `*.enum.ts` |
| Puertos (interfaces)  | `modules/<x>/domain/*.port.ts`                           |
| Adaptadores           | `modules/<x>/infrastructure/`                            |
| Guardias RBAC         | `common/guards/` + `@Roles()` en `common/decorators/`    |
| Interceptores         | `common/interceptors/`                                   |
| Migraciones y seeds   | `shared/infrastructure/database/`                        |
| Configuración         | `config/`                                                |

### 2.2 `marine-fleet-frontend/`

```
marine-fleet-frontend/
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── docs/
│   └── ARQUITECTURA.md                   # copia compartida con el backend
├── public/
├── src/
│   ├── main.tsx                          # monta el RouterProvider
│   ├── styles.css                        # tokens + diseño heredado de la v1
│   ├── vite-env.d.ts
│   ├── test-setup.ts                     # jest-dom, cleanup y polyfill de Storage
│   │
│   ├── app/
│   │   └── routes.tsx                    # SOLO una línea por feature
│   │
│   ├── core/                             # DUEÑO: Dev 1 — PR con 2 reviewers
│   │   ├── session/                      # NO se llama auth/: ver nota en 4.6
│   │   │   ├── permiso.enum.ts           # espejo del RBAC del backend
│   │   │   ├── session.store.ts          # estado de sesión (Zustand)
│   │   │   ├── session.service.ts        # login, restaurar, logout
│   │   │   └── token.store.ts            # único módulo que toca localStorage
│   │   ├── guards/
│   │   │   ├── RequireAuth.tsx           # exige sesión; rehidrata en F5
│   │   │   └── RequirePermiso.tsx        # exige permiso; no baja el chunk
│   │   ├── http/
│   │   │   ├── types.ts                  # Peticion, Siguiente, Interceptor, componer
│   │   │   ├── api-url.interceptor.ts    # prefija /api/v1
│   │   │   ├── auth.interceptor.ts       # inyecta el Bearer token
│   │   │   ├── loading.interceptor.ts    # cuenta peticiones en vuelo
│   │   │   ├── error.interceptor.ts      # 401 -> logout, 403/409 -> aviso
│   │   │   └── api-client.ts             # compone la cadena y desenvuelve el sobre
│   │   ├── models/
│   │   │   ├── api-response.ts           # ApiResponse, PageMeta, ApiError
│   │   │   └── page-result.ts
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx            # shell: header + sidebar + <Outlet />
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx               # menú filtrado por permisos
│   │   └── services/
│   │       ├── loading.store.ts
│   │       └── notification.store.ts
│   │
│   ├── shared/                           # DUEÑO: Dev 4 — tontos, sin negocio
│   │   ├── ui/
│   │   │   ├── BadgeAmenaza.tsx          # BAJO/MEDIO/ALTO con color
│   │   │   ├── PageHeader.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Cargando.tsx
│   │   │   └── conSuspense.tsx           # envoltorio de las rutas lazy
│   │   ├── hooks/
│   │   │   └── useHasPermission.ts       # oculta acciones sin permiso
│   │   └── utils/
│   │       ├── berries.ts                # formato de recompensas
│   │       ├── nivel-amenaza.ts
│   │       └── fecha.ts                  # portado de la v1
│   │
│   ├── features/                         # ZONA DE TRABAJO PARALELO
│   │   ├── auth/                         # RF-7 · DUEÑO: Dev 1
│   │   │   ├── auth.routes.tsx
│   │   │   └── pages/{LoginPage,MfaPage}.tsx
│   │   │
│   │   ├── criminales/                   # RF-1 · DUEÑO: Dev 2  (REFERENCIA)
│   │   │   ├── criminales.routes.tsx     # ÚNICO archivo de rutas de Dev 2
│   │   │   ├── pages/
│   │   │   │   ├── CriminalListPage.tsx
│   │   │   │   ├── CriminalDetailPage.tsx
│   │   │   │   └── CriminalFormPage.tsx
│   │   │   ├── components/
│   │   │   ├── data-access/
│   │   │   │   ├── criminales-api.ts
│   │   │   │   └── criminales.store.ts   # estado con Zustand
│   │   │   └── models/
│   │   │       └── criminal.ts
│   │   │
│   │   ├── inteligencia/                 # RF-3 · DUEÑO: Dev 5  (PORTADO DE LA v1)
│   │   │   ├── inteligencia.routes.tsx
│   │   │   ├── pages/
│   │   │   │   ├── AvistamientosPage.tsx # CRUD de la v1, ya en la arquitectura
│   │   │   │   └── ReportesPage.tsx
│   │   │   ├── data-access/
│   │   │   │   └── inteligencia-api.ts
│   │   │   └── models/
│   │   │       └── avistamiento.ts
│   │   │
│   │   ├── recompensas/                  # RF-1/RF-5 · DUEÑO: Dev 3
│   │   ├── amenaza/                      # RF-5 · DUEÑO: Dev 3
│   │   ├── carteles/                     # RF-2 · DUEÑO: Dev 4
│   │   ├── operativos/                   # RF-4 · DUEÑO: Dev 6
│   │   ├── incidentes/                   # RF-6 · DUEÑO: Dev 6
│   │   └── admin/                        # RF-7 · DUEÑO: Dev 1
│   │       (cada una: <feature>.routes.tsx, pages/, components/,
│   │        data-access/, models/)
│   │
│   └── assets/
│       ├── images/
│       ├── fonts/
│       ├── icons/
│       └── i18n/es.json
├── index.html
├── vite.config.ts                        # proxy /api, alias y config de vitest
├── tsconfig.json                         # referencias a app y node
├── tsconfig.app.json
├── tsconfig.node.json
├── .eslintrc.json                        # GENERADO: ver nota en 4.6
├── .prettierrc
├── .editorconfig
├── .gitattributes
├── .env.example
├── commitlint.config.cjs
├── package.json
└── README.md
```

**Mapa de responsabilidades en el frontend:**

| Elemento                 | Ubicación                                                   |
| ------------------------ | ----------------------------------------------------------- |
| Páginas (con ruta)       | `features/<x>/pages/`                                       |
| Componentes internos     | `features/<x>/components/`                                  |
| Módulos HTTP             | `features/<x>/data-access/<x>-api.ts`                       |
| Estado                   | `features/<x>/data-access/<x>.store.ts` (Zustand)           |
| Modelos / tipos          | `features/<x>/models/`                                      |
| Rutas de la feature      | `features/<x>/<x>.routes.tsx`                               |
| Guardias RBAC            | `core/guards/`                                              |
| Interceptores            | `core/http/*.interceptor.ts`, compuestos en `api-client.ts` |
| UI reutilizable          | `shared/ui/`                                                |
| Assets                   | `src/assets/`                                               |
| Configuración de entorno | `vite.config.ts` + `.env` (`VITE_API_URL`)                  |

---

## 3. Estrategia Git y Repartición de Trabajo

### 3.1 Flujo de ramas (GitFlow simplificado, idéntico en ambos repos)

```
main            producción. Protegida. Solo recibe merge desde release/* o hotfix/*.
                Cada merge se etiqueta: v1.0.0, v1.1.0
  │
develop         integración. Protegida. Rama base de todo feature.
                Siempre debe compilar y pasar CI.
  │
  ├── feature/<RF>-<modulo>-<descripcion-corta>
  ├── fix/<issue>-<descripcion-corta>
  ├── chore/<descripcion-corta>
  ├── docs/<descripcion-corta>
  └── refactor/<descripcion-corta>

release/vX.Y.Z  se corta de develop al cerrar el sprint. Solo fixes.
hotfix/<desc>   se corta de main. Se mergea a main Y a develop.
```

**Nomenclatura obligatoria** (minúsculas, `kebab-case`, sin ñ ni acentos):

```
feature/rf1-criminales-crud
feature/rf2-carteles-generacion-automatica
feature/rf5-amenaza-motor-clasificacion
feature/rf7-auth-rbac-guards
fix/42-avistamiento-fecha-invalida
hotfix/token-refresh-expirado
chore/eslint-config-compartida
```

**Reglas de vida de la rama:**

1. Una rama por historia de usuario. Si la rama vive más de 3 días, está mal cortada: divídela.
2. **Siempre `rebase`, nunca `merge`, para traer `develop` a tu feature.** Resuelves conflictos en tu rama, no en el PR.
3. Nunca se hace rebase de una rama ya compartida con otro dev; ahí se usa merge.
4. La rama se borra al mergear (borrado automático en la configuración del repo).

```bash
git fetch origin && git rebase origin/develop
```

### 3.2 Asignación de módulos — Sprint 1 (2 semanas)

**Principio rector: vertical slice ownership.** Cada dev es dueño del _stack completo_ de su módulo (entidad + casos de uso + controller + feature del frontend). No se divide "uno hace backend y otro hace el frontend del mismo módulo": eso genera dependencia mutua diaria, y un bloqueado bloquea a dos. Con slices verticales, un dev puede terminar su RF sin esperar a nadie.

| Dev       | Rol Scrum / RBAC del caso                                | Backend (dueño)                                                      | Frontend (dueño)                             | Entregable Sprint 1                                                                                                        |
| --------- | -------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Dev 1** | Lead Técnico / **Especialista en Seguridad Informática** | `config/`, `shared/`, `common/`, `auth/`, `usuarios/`                | `core/`, `features/auth`, `features/admin`   | Scaffolding de ambos repos, CI, login JWT, `RolesGuard`, matriz de permisos, `authGuard` + interceptores                   |
| **Dev 2** | **Analista de Datos Criminales**                         | `criminales/` (criminales, organizaciones, membresías, antecedentes) | `features/criminales`                        | CRUD de criminales con las 3 categorías (pirata, revolucionario, independiente) + afiliación + listado con filtros         |
| **Dev 3** | **Almirante** (aprobación de recompensas)                | `recompensas/`, `amenaza/`                                           | `features/recompensas`, `features/amenaza`   | Solicitud y validación de recompensas + motor de clasificación `criterios_amenaza` + dashboard de riesgo                   |
| **Dev 4** | **Desarrollador Backend** (generación documental)        | `carteles/`                                                          | `features/carteles`, `shared/ui`             | Generación automática de wanted poster en PDF, versionado, listener de cambio de criminal/recompensa, librería `shared/ui` |
| **Dev 5** | **Director de Inteligencia**                             | `inteligencia/` (avistamientos, reportes ciudadanos)                 | `features/inteligencia`                      | Migración del CRUD actual de avistamientos a NestJS + reportes ciudadanos con flujo de revisión                            |
| **Dev 6** | **Coordinador de Operaciones**                           | `operativos/`, `incidentes/`, `catalogos/`                           | `features/operativos`, `features/incidentes` | **Migraciones de las tablas nuevas** (`operativos`, `incidentes`), tablero de operativos, historial de enfrentamientos     |

**Secuencia crítica del Sprint 1 (orden, no negociable):**

| Día | Hito                                                                                 | Responsable   | Desbloquea |
| --- | ------------------------------------------------------------------------------------ | ------------- | ---------- |
| 1   | Repos creados, scaffolding, ESLint/Prettier/Husky, CI verde, `develop` protegida     | Dev 1         | a todos    |
| 1-2 | **Taller de contratos:** se acuerdan y mergean DTOs, enums y `docs/CONTRATOS-API.md` | Todos         | a todos    |
| 2   | Entidades base + migración inicial del esquema existente                             | Dev 1 + Dev 2 | a todos    |
| 2   | Migración de tablas nuevas (`operativos`, `incidentes`)                              | Dev 6         | a Dev 6    |
| 3   | `JwtAuthGuard` + `RolesGuard` + `authGuard` en `develop`                             | Dev 1         | a todos    |
| 3-9 | Desarrollo paralelo de slices verticales                                             | Devs 2-6      | —          |
| 10  | Integración, demo, retrospectiva                                                     | Todos         | —          |

Hasta que exista el guard de RBAC (día 3), los demás devs trabajan con `@Public()` en sus controllers y lo quitan al final. Así nadie espera.

### 3.3 Políticas de Pull Request y reglas de protección

**Reglas de protección en `main` y `develop`** (GitHub → Settings → Branches):

| Regla                                           | `develop` | `main`              |
| ----------------------------------------------- | --------- | ------------------- |
| Require pull request before merging             | Sí        | Sí                  |
| Required approvals                              | 1         | 2 (incluye al Lead) |
| Dismiss stale approvals on new push             | Sí        | Sí                  |
| Require status checks (`lint`, `test`, `build`) | Sí        | Sí                  |
| Require branches to be up to date               | Sí        | Sí                  |
| Require conversation resolution                 | Sí        | Sí                  |
| Require linear history (squash only)            | Sí        | Sí                  |
| Allow force push / deletions                    | No        | No                  |
| Include administrators                          | Sí        | Sí                  |

Más un `CODEOWNERS` para que el reviewer se asigne solo:

```
# .github/CODEOWNERS
/src/shared/              @dev1
/src/common/              @dev1
/src/config/              @dev1
/src/app.module.ts        @dev1
/src/modules/criminales/  @dev2
/src/modules/recompensas/ @dev3
/src/modules/amenaza/     @dev3
/src/modules/carteles/    @dev4
/src/modules/inteligencia/@dev5
/src/modules/operativos/  @dev6
/src/modules/incidentes/  @dev6
```

**Políticas de PR:**

1. **Máximo ~400 líneas de diff.** Un PR que nadie puede revisar en 20 minutos no se revisa: se aprueba a ciegas.
2. **Título del PR = commit de squash**, y debe cumplir Conventional Commits.
3. Plantilla obligatoria (`.github/pull_request_template.md`): qué cambia, RF que cubre, cómo probarlo, checklist (CI verde, sin `console.log`, DTOs validados, endpoint con `@Roles`, migración incluida si toca la BD).
4. **Squash merge siempre.** `develop` queda con un commit legible por historia de usuario.
5. Nadie aprueba su propio PR. Nadie mergea sin CI verde ni con conversaciones abiertas.
6. Revisión en menos de 24 horas laborales. El reviewer bloqueado es el cuello de botella más común en equipos de 6.

**Resolución y prevención de conflictos:**

Los únicos puntos de conflicto estructural, y su mitigación:

| Archivo              | Por qué colisiona                   | Mitigación                                                                                                                |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/app.module.ts`  | todos registran su módulo           | cada dev agrega **una línea** en orden alfabético y la añade el día 1 ya vacía. Conflicto trivial: se aceptan ambos lados |
| `src/app/routes.tsx` | todos agregan su ruta lazy          | igual: una línea por feature, en orden alfabético, declaradas todas el día 1 apuntando a un placeholder                   |
| Migraciones          | dos devs generan migración a la vez | nombre con timestamp + nunca editar una migración ya mergeada; se corrige con una nueva                                   |
| `package.json`       | dos devs instalan dependencias      | una sola persona (Dev 1) aprueba nuevas dependencias; el lockfile se resuelve regenerándolo, no editándolo a mano         |
| `shared/` y `core/`  | zona común                          | protegidos por `CODEOWNERS`: pasan por el Lead                                                                            |

Procedimiento ante conflicto: lo resuelve **quien abrió el PR**, en su rama, con rebase. Si el conflicto es en `shared/`, `core/` o `package.json`, se resuelve en pareja con el Lead. Para el lockfile:

```bash
git checkout --theirs package-lock.json && npm install
```

**Semántica de commits — Conventional Commits (verificada por CI con commitlint):**

```
<tipo>(<alcance>): <descripcion en imperativo, minuscula, sin punto final>

[cuerpo opcional]
[footer opcional: Closes #42  |  BREAKING CHANGE: ...]
```

Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
Alcances permitidos (`scope-enum` de commitlint): `auth`, `usuarios`, `criminales`, `recompensas`, `amenaza`, `carteles`, `inteligencia`, `operativos`, `incidentes`, `catalogos`, `core`, `shared`, `config`, `ci`, `deps`.

```
feat(criminales): registrar criminal con afiliacion a organizacion
feat(carteles): generar cartel automatico al cambiar la recompensa
fix(inteligencia): validar formato de fecha_hora en avistamientos
refactor(amenaza): extraer motor de clasificacion al dominio
test(recompensas): cubrir politica de validacion por monto
chore(deps): actualizar nestjs a 11.x
feat(auth)!: mover verificacion de rol a RolesGuard global

BREAKING CHANGE: los endpoints ahora exigen el header Authorization.
```

---

## 4. Scripts y Archivos de Configuración de Inicio

### 4.1 Inicialización del backend

```bash
npm i -g @nestjs/cli
nest new marine-fleet-backend --package-manager npm --strict
cd marine-fleet-backend

# Infraestructura
npm i @nestjs/config @nestjs/typeorm typeorm mysql2 joi
npm i @nestjs/swagger class-validator class-transformer
npm i @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm i @nestjs/event-emitter helmet compression
npm i pdfkit uuid

# Tipos y calidad
npm i -D @types/passport-jwt @types/bcrypt @types/pdfkit @types/uuid
npm i -D eslint prettier eslint-config-prettier eslint-plugin-prettier
npm i -D husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init

# Generación de los módulos (ejecutado por el Lead el día 1)
for m in auth usuarios criminales recompensas amenaza carteles inteligencia operativos incidentes catalogos; do
  nest g module "modules/$m"
done
```

Scripts de `package.json` (backend):

```json
{
  "scripts": {
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "build": "nest build",
    "lint": "eslint \"{src,test}/**/*.ts\" --max-warnings 0",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "test": "jest",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "typeorm": "typeorm-ts-node-commonjs -d src/shared/infrastructure/database/data-source.ts",
    "migration:generate": "npm run typeorm -- migration:generate src/shared/infrastructure/database/migrations/$npm_config_name",
    "migration:run": "npm run typeorm -- migration:run",
    "migration:revert": "npm run typeorm -- migration:revert",
    "seed": "ts-node src/shared/infrastructure/database/seeds/one-piece.seed.ts",
    "prepare": "husky"
  }
}
```

### 4.2 Inicialización del frontend

```bash
npm create vite@latest marine-fleet-frontend -- --template react-ts
cd marine-fleet-frontend

# Enrutamiento y estado
npm i react-router-dom zustand

# Pruebas
npm i -D vitest jsdom @testing-library/react @testing-library/dom \
         @testing-library/jest-dom @testing-library/user-event

# Calidad
npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
         eslint-plugin-react-hooks eslint-config-prettier eslint-plugin-prettier prettier
npm i -D husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init

# Estructura base (la ejecuta el Lead el día 1)
mkdir -p src/app src/core/{session,guards,http,models,layout,services}
mkdir -p src/shared/{ui,hooks,utils} src/assets/{images,fonts,icons,i18n}

# Una carpeta por feature; cada dev trabaja solo dentro de la suya
for f in auth criminales recompensas amenaza carteles inteligencia operativos incidentes admin; do
  mkdir -p "src/features/$f"/{pages,components,data-access,models}
done
```

> **`vitest` debe ir alineado con `vite`.** Con `vitest` 2 y `vite` 6, npm instala una copia anidada de Vite dentro de vitest y el typecheck de `vite.config.ts` falla con un choque de tipos de `Plugin`. La combinación verificada aquí es **vite 6 + vitest 3**. Y el `defineConfig` del archivo de configuración debe importarse de `vitest/config`, no de `vite`: el de `vite` no acepta la clave `test`.

Scripts de `package.json` (frontend):

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint \"src/**/*.{ts,tsx}\" --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,json}\" \"*.{ts,json,cjs,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css,json}\" \"*.{ts,json,cjs,md}\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepare": "husky"
  }
}
```

El proxy de `vite.config.ts` evita que cada dev tenga que configurar CORS a mano: el frontend pide `/api/...` a su propio origen y Vite lo reenvía al backend.

```ts
server: {
  port: 5173,
  proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
}
```

Por eso `VITE_API_URL` va **vacía** en desarrollo. Solo se usa para apuntar a un backend remoto, por ejemplo un entorno de staging.

### 4.3 `tsconfig.json` — backend

Lo importante es `strict: true` desde el día 1 (activarlo después, con 10 000 líneas escritas, no ocurre nunca) y los path aliases, que evitan los `../../../` y, con ellos, los conflictos cuando alguien mueve una carpeta.

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2023",
    "lib": ["ES2023"],
    "outDir": "./dist",
    "baseUrl": "./",
    "declaration": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@common/*": ["src/common/*"],
      "@config/*": ["src/config/*"],
      "@modules/*": ["src/modules/*"]
    }
  },
  "exclude": ["node_modules", "dist"]
}
```

### 4.4 `tsconfig` — frontend

Se usan tres archivos, que es el patrón de Vite: `tsconfig.json` solo referencia a los otros dos, `tsconfig.app.json` cubre `src/` y `tsconfig.node.json` cubre `vite.config.ts`. Separarlos importa porque el código del navegador y el de configuración no comparten `lib` ni `types`.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "noEmit": true,
    "skipLibCheck": true,

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "forceConsistentCasingInFileNames": true,

    "baseUrl": ".",
    "paths": {
      "@app/*": ["src/app/*"],
      "@core/*": ["src/core/*"],
      "@shared/*": ["src/shared/*"],
      "@features/*": ["src/features/*"]
    },

    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

`strict: true` desde el día 1 (activarlo después, con 10 000 líneas escritas, no ocurre nunca) y los path aliases, que evitan los `../../../` y, con ellos, los conflictos cuando alguien mueve una carpeta. **Los mismos alias deben declararse en `resolve.alias` de `vite.config.ts`**: TypeScript resuelve con uno y el bundler con el otro, y si se desalinean el editor compila pero el build no.

### 4.5 ESLint — backend (`.eslintrc.cjs`)

La regla clave no es de estilo: es la de límites de capa. Sin ella, la arquitectura hexagonal se degrada en dos sprints porque alguien importa un repositorio TypeORM dentro del dominio y nadie lo nota en la revisión.

```js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { project: 'tsconfig.json', sourceType: 'module' },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  root: true,
  env: { node: true, jest: true },
  ignorePatterns: ['.eslintrc.cjs', 'dist'],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    'no-console': ['error', { allow: ['warn', 'error'] }],
    complexity: ['warn', 12],
    'max-lines': ['warn', { max: 300, skipBlankLines: true }],
  },
  overrides: [
    {
      // El dominio debe quedar limpio de framework e infraestructura
      files: ['src/modules/*/domain/**/*.ts', 'src/shared/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: ['@nestjs/*'], message: 'El dominio no depende de NestJS.' },
              { group: ['typeorm', 'mysql2'], message: 'El dominio no depende del ORM.' },
              {
                group: ['**/infrastructure/**'],
                message: 'El dominio no depende de infraestructura.',
              },
              { group: ['**/presentation/**'], message: 'El dominio no depende de presentacion.' },
            ],
          },
        ],
      },
    },
    {
      // Los casos de uso hablan con puertos, no con adaptadores
      files: ['src/modules/*/application/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/infrastructure/**'],
                message: 'Usa el puerto del dominio, no el adaptador.',
              },
            ],
          },
        ],
      },
    },
    {
      // EXCEPCION ACOTADA: las entidades si pueden importar typeorm (ver abajo).
      // Todo lo demas sigue prohibido tambien en ellas.
      files: ['src/modules/*/domain/**/*.entity.ts', 'src/shared/domain/**/*.entity.ts'],
      rules: {
        'max-lines': 'off',
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: ['@nestjs/*'], message: 'Una entidad no depende de NestJS.' },
              { group: ['mysql2', 'mysql2/*'], message: 'Una entidad no usa el driver directo.' },
              {
                group: ['**/infrastructure/**'],
                message: 'El dominio no depende de infraestructura.',
              },
              { group: ['**/presentation/**'], message: 'El dominio no depende de presentacion.' },
            ],
          },
        ],
      },
    },
  ],
};
```

> **La excepción de las entidades, y por qué existe.** Hay una tensión real: la regla dice que el dominio no depende del ORM, pero las entidades están en `domain/` con los decoradores de TypeORM. Al verificar el linter, esa contradicción apareció como 17 errores — no era un detalle de configuración, era una decisión sin tomar.
>
> Se eligió el **modelo de dominio anotado para persistencia**. La alternativa ortodoxa (entidades puras en `domain/`, entidades de persistencia en `infrastructure/`, un mapper por agregado) significa ~15 clases duplicadas y ~15 mappers que seis personas tendrían que mantener sincronizados durante un semestre, para un beneficio que solo se cobra al cambiar de ORM. El precio, explícito: un cambio de ORM toca las entidades, no solo los adaptadores.
>
> La excepción está **acotada a los archivos `*.entity.ts`**. El resto de `domain/` —value objects, políticas, servicios de dominio, puertos— no puede tocar TypeORM, y los casos de uso siguen dependiendo de puertos y probándose sin base de datos, que es lo que de verdad sostiene el trabajo en paralelo. Queda registrado en el ADR 0002.

### 4.6 ESLint — frontend (`.eslintrc.json`)

```json
{
  "root": true,
  "env": { "browser": true, "es2022": true },
  "overrides": [
    {
      "files": ["*.ts", "*.tsx"],
      "parser": "@typescript-eslint/parser",
      "parserOptions": {
        "project": ["./tsconfig.app.json", "./tsconfig.node.json"],
        "ecmaFeatures": { "jsx": true }
      },
      "plugins": ["@typescript-eslint", "react-hooks"],
      "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react-hooks/recommended",
        "plugin:prettier/recommended"
      ],
      "rules": {
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/explicit-function-return-type": [
          "warn",
          { "allowExpressions": true, "allowTypedFunctionExpressions": true }
        ],
        "no-console": ["error", { "allow": ["warn", "error"] }]
      }
    }
    // + un bloque por zona y por feature con no-restricted-imports (ver abajo)
  ]
}
```

> **`allowExpressions` no es opcional.** En React los manejadores inline (`onClick={() => …}`) son expresiones de función; sin esa opción, `explicit-function-return-type` marca cada uno y, con `--max-warnings 0`, el lint falla en toda página con un botón.

> **`plugins` y `parser` tampoco.** Declarar reglas `@typescript-eslint/*` sin cargar el plugin produce decenas de errores _"Definition for rule was not found"_ y ni una sola verificación real. Pasó en este proyecto con 112 errores de ese tipo.

**Cómo se enforza de verdad el aislamiento entre features** (esto se verificó, no se asumió):

Un patrón único no sirve. Un import a otra feature se escribe con una cantidad variable de `../` según la profundidad del archivo (`../criminales/...` desde la raíz de la feature, `../../../criminales/...` desde `pages/x/`), así que un patrón que fije la profundidad deja pasar el resto. Comprobado: una violación escrita tres niveles abajo no se detectaba.

Lo que sí funciona es **un `overrides` por feature, cada uno prohibiendo el nombre de las otras ocho** con el patrón `**/<otra-feature>/**`, que empareja a cualquier profundidad, más `@features/*` para la forma con alias. Son nueve bloques casi idénticos, así que `.eslintrc.json` **se genera con un script** en lugar de escribirse a mano: nueve bloques copiados a mano son una invitación a un typo que desactiva la regla en silencio.

Se evaluó `eslint-plugin-boundaries`, que modela zonas explícitamente y sería la opción correcta a mayor escala. Se descartó: en su versión 7 la clasificación de elementos no reconoció esta estructura sin más configuración, y una regla que no dispara es peor que ninguna porque da falsa confianza.

La versión con `no-restricted-imports` está verificada con **pruebas negativas en las tres direcciones**: feature → otra feature (relativo y con alias), `core/` → `shared/`, y `shared/` → feature. Las cuatro violaciones de prueba fueron rechazadas y el código real sigue pasando.

> **Por qué `core/session/` y no `core/auth/`:** el enforcement se basa en nombres de carpeta, y `core/auth/` colisionaba con `features/auth/`: el patrón `**/auth/**` marcaba como violación cualquier import legítimo de `core/auth/session.service`. Renombrar la carpeta de `core` a `session` elimina la colisión y además quita una ambigüedad real del código: `core/session/` es el estado de la sesión y los permisos; `features/auth/` son las pantallas de login y MFA. Eran dos cosas distintas con el mismo nombre.

**Al agregar o renombrar una feature hay que actualizar los nueve bloques**, no solo el propio: si el nombre nuevo no aparece en la lista de prohibiciones de las otras ocho, la regla no protege nada y nadie se da cuenta.

### 4.7 Prettier y EditorConfig (idénticos en ambos repos)

`.prettierrc` — se copia igual en los dos repos. Este archivo es el que evita el 80 % de los conflictos falsos: sin un formateador compartido, cada guardado reformatea el archivo entero y el diff se vuelve ilegible.

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "semi": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "endOfLine": "lf",
  "arrowParens": "always",
  "bracketSpacing": true
}
```

`.editorconfig` — crítico en este equipo, que trabaja en Windows: fija `end_of_line = lf` y evita los PR enteros marcados como modificados por CRLF.

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

Complemento obligatorio en ambos repos (`.gitattributes`):

```
* text=auto eol=lf
*.png binary
*.jpg binary
*.pdf binary
```

### 4.8 Husky, lint-staged y commitlint

Las convenciones que no se verifican automáticamente se incumplen. Esto las vuelve mecánicas.

`.husky/pre-commit`:

```sh
npx lint-staged
```

`.husky/commit-msg`:

```sh
npx --no -- commitlint --edit "$1"
```

`package.json` (fragmento, en ambos repos):

```json
{
  "lint-staged": {
    "*.{ts,tsx,css,json,md}": ["prettier --write"],
    "*.ts": ["eslint --fix --max-warnings 0"]
  }
}
```

`commitlint.config.cjs`:

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'auth',
        'usuarios',
        'criminales',
        'recompensas',
        'amenaza',
        'carteles',
        'inteligencia',
        'operativos',
        'incidentes',
        'catalogos',
        'core',
        'shared',
        'config',
        'ci',
        'deps',
      ],
    ],
    'scope-empty': [2, 'never'],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
  },
};
```

### 4.9 CI (`.github/workflows/ci.yml`, ambos repos)

Es el check obligatorio de la regla de protección de rama. Sin CI, "require status checks" no tiene nada que exigir.

```yaml
name: CI
on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop, main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

### 4.10 `.env.example` del backend

El `.env` real nunca se commitea; el `.example` sí, y se valida al arrancar con Joi en `config/env.validation.ts` para que un dev con variables mal puestas obtenga un error claro en lugar de un fallo oscuro de conexión.

```dotenv
NODE_ENV=development
PORT=3000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=marina_inteligencia

JWT_SECRET=cambiar-en-cada-entorno
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=cambiar-en-cada-entorno
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:5173
STORAGE_PATH=./storage/carteles
```

---

## 5. Resumen de las decisiones que sostienen el trabajo en paralelo

| Decisión                                                     | Problema que elimina                               |
| ------------------------------------------------------------ | -------------------------------------------------- |
| Un módulo NestJS por RF, con dueño único                     | Seis personas editando `server.ts`                 |
| Puertos e inversión de dependencias                          | Esperar a que el módulo de otro esté terminado     |
| Contratos (DTOs/OpenAPI) mergeados el día 2                  | Backend y frontend desincronizados                 |
| Vertical slice ownership (back + front por dev)              | Dependencia diaria entre dos personas por módulo   |
| `*.routes.tsx` por feature, referenciado con una línea       | Conflictos en el router raíz                       |
| `React.lazy` por página                                      | Un bundle monolítico y acoplamiento entre features |
| Interceptores HTTP en `core/http/`, no en cada feature       | Seis manejos distintos del mismo 403               |
| TypeORM (entidad y migración por archivo) en lugar de Prisma | `schema.prisma` como nuevo cuello de botella       |
| Prettier + EditorConfig + `.gitattributes eol=lf`            | Conflictos falsos por formato y CRLF en Windows    |
| ESLint con límites de capa y entre features                  | Erosión silenciosa de la arquitectura              |
| Husky + commitlint + CI como check requerido                 | Convenciones documentadas que nadie cumple         |
| `CODEOWNERS` + ramas protegidas + squash merge               | Revisión informal e historia ilegible              |
| Ramas de máximo 3 días, PR de máximo 400 líneas              | Merges gigantes al final del sprint                |

---

## 6. Estado de los repositorios

Los dos proyectos son ya **repositorios git independientes**, hermanos en el disco:

```
6 Semestre/
├── marine-fleet-backend/     repo git propio · ramas: main, develop
├── marine-fleet-frontend/    repo git propio · ramas: main, develop, archive/scaffold-angular
└── Caso_13_IngSoft/          la v1 que funciona hoy (React + Express) y el esquema SQL
```

Cada repositorio tiene su propio `package.json`, `tsconfig`, ESLint, Prettier, `.gitignore`,
`.gitattributes`, hooks de Husky, workflow de CI, `CODEOWNERS`, plantilla de PR y una copia de
este documento. `Caso_13_IngSoft/` **se deja intacto**: es el sistema que funciona y la fuente
del esquema SQL. Se retira cuando el Sprint 1 cierre.

La rama `archive/scaffold-angular` del frontend conserva el primer scaffolding, que se hizo en
Angular antes de decidir quedarse en React. No se borró para no destruir trabajo, pero **no se
mergea a nada**: está ahí solo como registro.

**Instalación (cada dev, una vez):**

```bash
cd marine-fleet-backend && npm install && cp .env.example .env
npm run migration:run && npm run seed && npm run start:dev
```

```bash
cd marine-fleet-frontend && npm install && npm run dev
```

El backend queda en `http://localhost:3000` (Swagger en `/api/docs`) y el frontend en
`http://localhost:5173`. El frontend **necesita el backend arriba**: su proxy reenvía `/api`.

### Lo que falta para que el equipo pueda trabajar

1. **Crear los dos repositorios vacíos en GitHub** —sin README, sin `.gitignore` y sin
   licencia— y agregar el remoto a cada repo local, luego `git push -u origin main` y
   `git push -u origin develop`.
2. **Reemplazar `@dev1`…`@dev6` en los dos `CODEOWNERS`** por los usuarios reales. Mientras
   sean placeholders, GitHub marca el archivo como inválido, no asigna reviewers y la política
   de revisión queda escrita pero sin efecto.
3. **Aplicar las reglas de protección de la sección 3.3** sobre `main` y `develop` en ambos
   repositorios, y poner `develop` como rama por defecto para que los PR apunten ahí.

### Qué quedó implementado

| Zona                                    | Estado                                                                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend `config/`, `common/`, `shared/` | Completo: guards RBAC globales, 3 interceptores, filtro de excepciones con traducción de errores de dominio a HTTP, paginación, value objects, eventos de dominio, puerto de almacenamiento |
| Backend `modules/criminales`            | **Slice vertical de referencia** (RF-1): 4 entidades, 2 puertos, 4 casos de uso, adaptador TypeORM, controller con RBAC y auditoría, 3 DTOs, mapper y pruebas sin base de datos             |
| Backend `modules/amenaza`               | Motor de clasificación de RF-5 implementado y probado (función pura, 6 casos de prueba)                                                                                                     |
| Backend migraciones                     | `CreateOperativos` y `CreateIncidentes`: las tablas que faltaban para RF-4 y RF-6                                                                                                           |
| Backend seed                            | Los 7 roles con su matriz de permisos y un usuario por rol para probar RBAC                                                                                                                 |
| Frontend `core/`                        | Completo: sesión con Zustand, `RequireAuth`, `RequirePermiso`, los 4 interceptores compuestos sobre `fetch`, cliente HTTP, layout con menú filtrado por permisos, notificaciones            |
| Frontend `features/criminales`          | **Slice de referencia**: modelo, módulo HTTP, store y página de listado con los tres estados                                                                                                |
| Frontend `features/inteligencia`        | **CRUD de avistamientos portado de la v1**, ya dentro de la arquitectura. Sin backend hasta que Dev 5 implemente el módulo                                                                  |
| Frontend resto de features              | Rutas declaradas con sus guards + página placeholder que nombra lo pendiente y su responsable                                                                                               |
| Verificación                            | En ambos repos pasan `format:check`, `lint`, `test` y `build`. El aislamiento entre capas y entre features está comprobado con pruebas negativas, no asumido                                |

Cada `*.module.ts` del backend y cada página placeholder del frontend lleva en su cabecera la
lista de archivos pendientes de su sprint. Es el punto de partida de su dueño: nadie empieza
ante una carpeta vacía.
