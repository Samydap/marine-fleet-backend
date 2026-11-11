# Que cambia

<!-- Una o dos frases. Si necesitas mas de cinco, el PR es demasiado grande. -->

## Requerimiento funcional que cubre

<!-- RF-1 Criminales / RF-2 Carteles / RF-3 Inteligencia / RF-4 Operativos / RF-5 Amenaza / RF-6 Incidentes / RF-7 RBAC -->

Closes #

## Como probarlo

1.
2.
3.

## Checklist

- [ ] El titulo del PR cumple Conventional Commits (`feat(criminales): ...`)
- [ ] CI en verde (format, lint, test, build)
- [ ] El diff es menor a ~400 lineas
- [ ] Sin `console.log` ni codigo comentado
- [ ] DTOs con `class-validator` en toda entrada
- [ ] Endpoints con `@Roles(...)` o justificacion explicita de `@Public()`
- [ ] Migracion incluida si cambia el esquema (y no edite una migracion ya mergeada)
- [ ] No toque carpetas de otro dueño (ver CODEOWNERS)
- [ ] Rama rebasada contra `develop`
