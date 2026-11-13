# Seguridad: Auth, Usuarios y Auditoría (RF-7)

Módulos: `src/modules/auth`, `src/modules/usuarios`, `src/modules/auditoria`, más lo transversal de
`src/common` (guards e interceptores). Clases del diagrama: **Usuario**, **Auditoria** y los enums
**RolUsuario** y **TipoAccion**.

## Cómo se protege cada petición (antes de cualquier caso de uso)

```
Petición HTTP
  └─ JwtAuthGuard (global)   ¿trae "Authorization: Bearer <token>" válido?  no → 401
      └─ RolesGuard (global)  ¿el rol tiene el permiso de @RequierePermisos? no → 403
          └─ ValidationPipe   ¿el cuerpo cumple el DTO?                     no → 400
              └─ AuditInterceptor  registra la acción en la tabla `auditoria`
                  └─ Controller → Caso de uso → Puerto → Adaptador (TypeORM)
```

- **Seguro por defecto:** todo endpoint exige token, salvo los marcados con `@Public()` (login,
  refresh, reporte ciudadano, archivos de carteles y salud del sistema).
- **El permiso viaja en el token:** al iniciar sesión, el JWT lleva `rol`, `permisos` y
  `baseNavalId`. Por eso los guards no consultan la base en cada petición.
- **La matriz de permisos** está en `src/shared/domain/rbac/permiso.enum.ts`
  (`PERMISOS_POR_ROL`). El seed la copia a la tabla `roles`.

| Rol (perfil del caso)        | Puede, en resumen                                                            |
| ---------------------------- | ---------------------------------------------------------------------------- |
| Almirante                    | Todo (`ALL`), incluida la validación de recompensas de alto rango            |
| Director de Inteligencia     | Criminales, inteligencia, revisar reportes ciudadanos, carteles, reportes    |
| Analista de Datos Criminales | Criminales, solicitar recompensas, **único** que cambia criterios de amenaza |
| Coordinador de Operaciones   | Operativos, incidentes, catálogos de bases y zonas                           |
| Especialista en Seguridad    | Usuarios y auditoría                                                         |
| Desarrollador Backend        | Lectura general y configuración del sistema                                  |
| Capitán de base              | Opera sobre **su** base naval                                                |

---

## CU-AUTH-1 Iniciar sesión

- **Requerimiento:** "El sistema debe permitir el registro/autenticación de usuarios con roles
  diferenciados". "Las contraseñas deben almacenarse usando funciones de hash seguras (ej. bcrypt)".
- **Endpoint:** `POST /api/v1/auth/login` (público).
- **Flujo:** `AuthController.login` → `LoginDto` valida correo y contraseña →
  `LoginUseCase` busca al usuario por el puerto `UsuarioRepositoryPort` → compara con
  `PasswordHasherPort` (bcrypt) → si falla suma `intentos_fallidos`; al llegar a
  `MAX_INTENTOS_FALLIDOS` (5) la cuenta queda **BLOQUEADA** → si acierta emite los tokens con
  `TokenIssuerPort`.
- **Reglas:** el mismo mensaje para "el correo no existe" y "la contraseña está mal", para no
  revelar qué correos existen. Una cuenta bloqueada no entra ni con la contraseña correcta.
- **Tablas:** `usuarios`, `roles`, `auditoria` (acción `INICIAR_SESION`, también los intentos fallidos).

```json
// petición
{ "email": "almirante@marina.gov", "password": "Marina.2026" }
// respuesta 200
{ "success": true, "data": { "accessToken": "eyJ...", "refreshToken": "eyJ...",
  "usuario": { "id": "u-almirante", "rol": "ALMIRANTE", "permisos": ["ALL"], "baseNavalId": null } } }
```

Errores: `401 CREDENCIALES_INVALIDAS`, `400 CUENTA_BLOQUEADA`, `400 ROL_INACTIVO`.

## CU-AUTH-2 Renovar sesión

- **Endpoint:** `POST /api/v1/auth/refresh` (público) con `{ "refreshToken": "..." }`.
- **Flujo:** `RefreshTokenUseCase` verifica el refresh token con **otro secreto** (si se filtra
  no sirve como access token) → relee el usuario de la base → emite un par nuevo.
- **Regla clave:** los permisos salen de la base en ese momento, así un cambio de rol o un
  bloqueo se aplica en la siguiente renovación (máximo 15 min).
- Errores: `401 REFRESH_INVALIDO`, `401 SESION_INVALIDA`.

## CU-AUTH-3 Sesión actual

`GET /api/v1/auth/me`: devuelve el usuario leído de la base. El frontend lo usa al recargar
(F5) para restaurar la sesión.

---

## CU-USR-1 Crear usuario

- **Requerimientos:** autenticación con roles diferenciados; "asociar cada usuario a la base
  naval donde presta servicio, para efectos de trazabilidad y control de acceso por ubicación".
- **Endpoint:** `POST /api/v1/usuarios`. Permiso: `USUARIOS_ADMINISTRAR`.
- **Flujo:** `UsuariosController.crear` → `CrearUsuarioDto` → `CrearUsuarioUseCase`:
  1. `asegurarPuedeGestionarRol`: solo quien tiene `ALL` (el Almirante) crea Almirantes.
  2. `validarPoliticaContrasena`: 8 o más caracteres, con mayúscula, minúscula y número.
  3. `validarBaseSegunRol`: un Capitán debe tener base naval.
  4. Verifica que el correo no exista, que el rol exista y que la base esté activa
     (`BaseNavalLookupPort`).
  5. Guarda **solo el hash bcrypt** (`PasswordHasherPort`).
- Las reglas viven en `usuarios/domain/politica-usuarios.ts` y se prueban sin base de datos.

```json
{
  "nombreCompleto": "Tashigi",
  "email": "tashigi@marina.gov",
  "password": "Shigure.2026",
  "rol": "CAPITAN",
  "baseNavalId": "b-loguetown"
}
```

Errores: `400 CONTRASENA_DEBIL`, `400 EMAIL_DUPLICADO`, `400 BASE_REQUERIDA`,
`400 BASE_INVALIDA`, `403` si intenta crear un Almirante sin ser Almirante.

## CU-USR-2 Actualizar usuario (rol, base, estado, desbloqueo)

- **Endpoint:** `PATCH /api/v1/usuarios/:id` con `version` (concurrencia optimista).
- **Reglas:** nadie se cambia **a sí mismo** el rol o el estado (`AUTO_GESTION_NO_PERMITIDA`).
  Pasar una cuenta a `ACTIVO` también reinicia los intentos fallidos (así se desbloquea). Si
  otro administrador la modificó antes, responde `409 CONFLICTO_CONCURRENCIA`.

## CU-USR-3 Contraseñas

- `PATCH /api/v1/usuarios/me/contrasena`: el propio usuario la cambia; exige la actual.
- `PATCH /api/v1/usuarios/:id/contrasena`: un administrador la restablece.
- Las dos rutas aplican la misma política y guardan solo el hash.

## CU-USR-4 Consultas

`GET /api/v1/usuarios?rol=&baseNavalId=&estado=&q=` (paginado), `GET /api/v1/usuarios/:id`,
`GET /api/v1/usuarios/roles` (catálogo de roles con su matriz de permisos).

---

## CU-AUD-1 Registro automático en la bitácora

- **Requerimientos:** "registrar un historial (log) de cada modificación realizada sobre el
  registro de un criminal, indicando qué usuario la hizo y en qué fecha"; "garantizar que los
  registros críticos (recompensas, órdenes de captura) no puedan ser alterados sin dejar rastro".
- **Funciona en dos capas, a propósito:**
  1. **Aplicación:** todo endpoint marcado con `@Audit('ACCION', { entidad, tipo })` pasa por el
     `AuditInterceptor`. Este escribe en la tabla `auditoria` quién, qué, cuándo, sobre qué
     registro, desde qué IP y si funcionó. Las contraseñas y los tokens se guardan como `***`.
     También registra los intentos **fallidos** (un 403 al validar una recompensa es justo lo que
     un auditor quiere ver).
  2. **Base de datos:** los triggers `trg_criminales_historial_update/insert` escriben en
     `criminales_historial` cada campo que cambia (valor anterior, valor nuevo y usuario). Los de
     recompensas impiden cambiar el monto o borrar una recompensa (`SIGNAL 45000`) y registran
     cada cambio de estado. Así el rastro queda aunque alguien edite la base a mano en
     phpMyAdmin.

## CU-AUD-2 Consultar la bitácora

- **Requerimiento:** "permitir a los roles autorizados consultar la bitácora de auditoría,
  indicando usuario, acción realizada y fecha".
- **Endpoint:** `GET /api/v1/auditoria?usuarioId=&accion=&entidad=&entidadId=&exitoso=&desde=&hasta=`.
  Permiso: `AUDITORIA_LEER` (Especialista en Seguridad y Almirante).
- **Flujo:** `AuditoriaController` → `ConsultarAuditoriaUseCase`, que valida que el rango de
  fechas tenga sentido → `AuditoriaRepositoryPort` → `TypeOrmAuditoriaRepository`.
- La bitácora es de **solo inserción**: no hay endpoint para editarla ni borrarla.
