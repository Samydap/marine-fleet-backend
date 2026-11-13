# Cambios para el frontend (ajustes solicitados)

Todo es **aditivo**: ningún campo existente cambió de nombre ni de tipo. Rutas con prefijo `/api/v1`.

## 1. Segundo factor (MFA, TOTP)

Contrato pedido en `features/auth/data-access/mfa-api.ts`:

| Paso       | Endpoint                                 | Cuerpo                       | Respuesta                                                                                           |
| ---------- | ---------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| Login      | `POST /auth/login`                       | `{ email, password }`        | Sin MFA: igual que antes. **Con MFA**: `{ mfaRequerido: true, challengeToken, email }` (sin tokens) |
| Verificar  | `POST /auth/mfa/verify` (público)        | `{ challengeToken, codigo }` | `LoginResponseDto` (tokens + usuario)                                                               |
| Enrolar    | `POST /auth/mfa/enrolar` (con sesión)    | —                            | `{ secreto, urlOtpauth }` → la `urlOtpauth` va en un QR                                             |
| Activar    | `POST /auth/mfa/activar` (con sesión)    | `{ codigo }`                 | `204`                                                                                               |
| Desactivar | `POST /auth/mfa/desactivar` (con sesión) | `{ codigo }`                 | `204`                                                                                               |

- El `challengeToken` vence en 5 minutos y **no** sirve como access token.
- Un código incorrecto cuenta como intento fallido: con 5 seguidos la cuenta se bloquea.
- Errores: `401 CODIGO_MFA_INVALIDO`, `401 RETO_MFA_INVALIDO`, `400 MFA_YA_ACTIVO`,
  `400 MFA_NO_ENROLADO`, `400 MFA_NO_ACTIVO`.
- Los usuarios del seed **no** tienen MFA activo, así que la demo entra solo con contraseña.

En el frontend: si la respuesta del login trae `challengeToken`, navegar a `/auth/mfa`, y en
`mfaApi.verificar` usar el cuerpo que ya está comentado en el archivo.

## 2. Buscador público para `/reportar`

`GET /buscados?q=<nombre o alias>&limit=12` — **sin sesión**. Solo criminales ACTIVOS y solo
datos que ya salen en un cartel público:

```json
[
  {
    "id": "c-zoro",
    "nombre": "Roronoa Zoro",
    "alias": ["Cazador de Piratas"],
    "fotoUrl": null,
    "recompensaVigenteMonto": 1111000000,
    "nivelAmenaza": "ALTO",
    "organizacion": "Piratas del Sombrero de Paja"
  }
]
```

## 3. Nombres junto a los ids

Las respuestas siguen trayendo los ids y ahora agregan el nombre. Ya no hace falta resolverlos
con directorios:

| Endpoint(s)               | Campos nuevos                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/recompensas/**`         | `criminalNombre`, `criminalFotoUrl`, `solicitadaPorNombre`, `validadaPorNombre`                                                   |
| `/reportes-ciudadanos/**` | `criminalNombre`, `criminalFotoUrl`, `revisadoPorNombre`                                                                          |
| `/auditoria`              | `usuarioNombre`                                                                                                                   |
| `/criminales/**`          | `creadoPorNombre`, `actualizadoPorNombre`, `origenBaseNombre` (en el detalle)                                                     |
| `/operativos/**`          | `objetivoCriminalNombre`, `objetivoCriminalFotoUrl`, `baseLiderNombre`, `bases[].baseNavalNombre`, `responsables[].usuarioNombre` |
| `/incidentes/**`          | `baseNavalNombre`, `registradoPorNombre`, `criminales[].criminalNombre`, `criminales[].criminalFotoUrl`                           |

Si un id ya no existe, el nombre llega como `null`. Cómo funciona: el decorador `@ConNombres`
en el controller y el `NombresInterceptor`, que hacen una consulta por tipo de entidad para toda
la página (sin N+1).

## 4. Tendencia por afiliación sin doble conteo

`GET /reportes/tendencias?agrupar=afiliacion`: cada criminal cuenta **una sola vez**, en su
afiliación principal (LIDER > OFICIAL > MIEMBRO; a igual rango, la más antigua). Antes, un
criminal con dos membresías vigentes sumaba en las dos, y la suma de la tabla superaba el total
real de criminales.

## 5. Catálogos inactivos

`GET /catalogos/mares`, `/catalogos/zonas-influencia` y `/catalogos/bases-navales` aceptan
`?incluirInactivos=true`. Exige `CATALOGOS_ADMINISTRAR`; sin ese permiso responde `403`. Sin el
parámetro, el comportamiento es el de siempre: solo lo activo, para los formularios.
