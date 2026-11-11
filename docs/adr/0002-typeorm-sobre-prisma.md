# ADR 0002 — TypeORM en lugar de Prisma

- **Estado:** Aceptada
- **Fecha:** 2026-11-10
- **Decide:** Lead Tecnico + Analista de Datos Criminales

## Contexto

Ya existe un esquema MySQL disenado y poblado (`database/schema.sql`): quince tablas con
claves foraneas, columnas `version` para concurrencia optimista, campos JSON y un trigger
que alimenta `criminales_historial`. Seis desarrolladores van a crear y modificar entidades
en paralelo durante el mismo sprint.

## Decision

Usamos **TypeORM** con `synchronize: false`. El esquema vive exclusivamente en migraciones
versionadas bajo `src/shared/infrastructure/database/migrations/`.

## Consecuencias

### Positivas

- **Una entidad por archivo, dentro del modulo de su dueño.** Dos devs que crean entidades
  a la vez no se tocan.
- **Una migracion por archivo con timestamp en el nombre.** Dos migraciones concurrentes no
  colisionan; el orden lo fija el timestamp.
- Soporta el trigger y el esquema existentes sin pedir que se reescriban.
- `@VersionColumn` mapea directamente la columna `version` del esquema.

### Negativas

- Menos seguridad de tipos en queries que el cliente generado de Prisma.
- El query builder es mas verboso.
- Hay que recordar `synchronize: false`: si alguien lo activa, TypeORM puede alterar el
  esquema de produccion. Queda fijado en `database.config.ts` y revisado por CODEOWNERS.

## Decision complementaria: las entidades viven en `domain/`

Al verificar el linter aparecio una contradiccion entre dos decisiones propias: la regla
"el dominio no depende del ORM" y la ubicacion de las entidades en `domain/`.

Se resolvio a favor de un **modelo de dominio anotado para persistencia**: las entidades
estan en `domain/` con los decoradores de TypeORM, y la regla de ESLint tiene una excepcion
acotada a los archivos `*.entity.ts`.

La alternativa ortodoxa (entidades puras en `domain/`, entidades de persistencia en
`infrastructure/` y un mapper por agregado) se descarto por costo: son unas 15 clases
duplicadas y 15 mappers que seis personas tendrian que mantener sincronizados durante un
semestre, para un beneficio que solo se cobra si se cambia de ORM.

**El precio, explicito:** un cambio de ORM obliga a tocar las entidades, no solo los
adaptadores. Lo que se preserva es lo que de verdad importa para el trabajo en paralelo:
los casos de uso siguen dependiendo de puertos, se prueban sin base de datos y la excepcion
no aplica al resto de `domain/` (value objects, politicas, servicios de dominio), donde el
ORM sigue prohibido y verificado por el linter.

## Alternativa descartada

**Prisma.** Mejor DX y mejor tipado, pero concentra todo el modelo en un unico
`schema.prisma`. Con seis devs editandolo en paralelo, ese archivo se convierte en el
mismo cuello de botella que `server.ts` en la version 1: exactamente el problema que esta
arquitectura busca eliminar.
