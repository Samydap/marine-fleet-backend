# ADR 0001 — NestJS modular con Clean Architecture por modulo

- **Estado:** Aceptada
- **Fecha:** 2026-11-10
- **Decide:** Equipo completo (6 devs)

## Contexto

La version 1 del sistema concentraba toda la API en un unico `src/server.ts` con Express
y `mysql2` crudo (291 lineas para un solo requerimiento funcional). El sistema completo
cubre siete requerimientos funcionales y lo desarrollan seis personas en paralelo durante
sprints de dos semanas. Con un unico archivo de rutas, cualquier par de desarrolladores
que trabaje simultaneamente genera un conflicto de merge.

## Decision

Adoptamos NestJS con **un modulo por bounded context** y, dentro de cada modulo, cuatro
capas: `domain`, `application`, `infrastructure`, `presentation`.

La hexagonal es **pragmatica**: usamos puertos e inversion de dependencias en los modulos
con regla de negocio real (`criminales`, `recompensas`, `amenaza`, `carteles`, `operativos`)
y capa delgada (controller -> service -> repositorio) en `catalogos`, que es CRUD de lectura.

## Consecuencias

### Positivas

- El modulo es la unidad de paralelizacion: seis devs, seis carpetas disjuntas.
- La inyeccion de dependencias permite depender de un puerto y stubearlo: nadie se bloquea
  esperando el modulo de otro.
- El RBAC se resuelve una sola vez con un guard global, no siete veces mal.
- El Nest CLI impone la misma estructura a todos sin necesidad de vigilancia.

### Negativas

- Mas archivos por caso de uso que en un controller-service clasico.
- La curva de aprendizaje de DI y decoradores existe para quien no conoce NestJS.
- `app.module.ts` sigue siendo un punto compartido: se mitiga declarando las diez lineas
  de registro el dia 1, en orden alfabetico.

## Alternativas descartadas

- **Express por capas:** mantiene el problema de un archivo de rutas compartido y obliga a
  construir a mano DI, validacion y RBAC.
- **Hexagonal estricta en todos los modulos:** ceremonia sin retorno en los CRUD de catalogo
  para un proyecto de un semestre.
