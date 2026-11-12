# Guía de ejecución

Cómo levantar el sistema completo en tu máquina, de cero.

El proyecto son **dos repositorios** que se ejecutan a la vez:

| Repositorio             | Qué es        | Dónde queda             |
| ----------------------- | ------------- | ----------------------- |
| `marine-fleet-backend`  | La API        | `http://localhost:3000` |
| `marine-fleet-frontend` | La página web | `http://localhost:5173` |

> **Este documento está en los dos repositorios, igual.** Si lo modificas, actualiza las dos copias.

---

## 1. Requisitos

Antes de empezar necesitas instalado:

- **Node.js 22 o superior** — comprueba con `node -v`
- **XAMPP** (o cualquier MySQL/MariaDB) — para la base de datos
- **Git**

---

## 2. Clonar los dos repositorios

Ponlos en la misma carpeta, uno al lado del otro:

```bash
git clone https://github.com/Samydap/marine-fleet-backend.git
```

```bash
git clone https://github.com/Samydap/marine-fleet-frontend.git
```

---

## 3. Preparar la base de datos

**3.1. Inicia MySQL.** Abre el _XAMPP Control Panel_ y pulsa **Start** en la fila de MySQL.
Debe quedar en verde. Si no arranca, revisa el apartado de problemas al final.

**3.2. Crea la base de datos VACÍA.** Abre `http://localhost/phpmyadmin`, entra a la pestaña
**SQL** y ejecuta:

```sql
CREATE DATABASE marina_inteligencia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Nada más. Las tablas, los triggers de auditoría y los datos de prueba los crean los pasos 4.3 y
4.4 (`migration:run` y `seed`). **Ya no hace falta** el `database/schema.sql` del repositorio
viejo: la migración `1731200000000-InitSchema` lo reemplaza.

> Si ya tenías la base creada con el `schema.sql` viejo, también funciona: las migraciones usan
> `CREATE TABLE IF NOT EXISTS` y solo agregan las columnas que falten.

---

## 4. Levantar el backend

Abre una terminal **en la carpeta `marine-fleet-backend`**:

**4.1. Instala las dependencias** (solo la primera vez, tarda un par de minutos):

```bash
npm install
```

**4.2. Crea el archivo de configuración** copiando el de ejemplo:

```bash
cp .env.example .env
```

En Windows PowerShell, si `cp` no te funciona:

```bash
Copy-Item .env.example .env
```

Abre el archivo `.env` y ajusta dos cosas:

- **`DB_USER` y `DB_PASSWORD`**: pon los de tu MySQL. Con XAMPP recién instalado suele ser
  usuario `root` y contraseña vacía.
- **`JWT_SECRET` y `JWT_REFRESH_SECRET`**: cambia el texto de ejemplo por cualquier cadena de
  **mínimo 32 caracteres**. Si son más cortas, la aplicación no arranca.

**4.3. Crea todas las tablas** (esquema base, operativos, incidentes, auditoría, etc.):

```bash
npm run migration:run
```

**4.4. Carga los datos de prueba** (roles, un usuario por rol, mares, bases navales,
organizaciones, criminales con recompensa, avistamientos y criterios de amenaza):

```bash
npm run seed
```

**4.5. Arranca la API:**

```bash
npm run start:dev
```

Déjala corriendo. Cuando veas que arrancó, la API queda en `http://localhost:3000` y la
documentación interactiva de todos los endpoints en:

**`http://localhost:3000/api/docs`**

---

## 5. Levantar el frontend

Abre una **segunda terminal**, sin cerrar la anterior, **en la carpeta `marine-fleet-frontend`**:

**5.1. Instala las dependencias** (solo la primera vez):

```bash
npm install
```

**5.2. Arranca la página:**

```bash
npm run dev
```

Abre en el navegador:

**`http://localhost:5173`**

No necesitas configurar nada más: el frontend está preparado para hablar con el backend en
`http://localhost:3000` automáticamente.

---

## 6. Usuarios de prueba

El comando `npm run seed` del paso 4.4 crea un usuario por cada rol. Todos usan la misma
contraseña:

| Correo                                 | Rol                          |
| -------------------------------------- | ---------------------------- |
| `almirante@marina.gov`                 | Almirante                    |
| `director_inteligencia@marina.gov`     | Director de Inteligencia     |
| `analista_datos_criminales@marina.gov` | Analista de Datos Criminales |
| `coordinador_operaciones@marina.gov`   | Coordinador de Operaciones   |
| `desarrollador_backend@marina.gov`     | Desarrollador Backend        |
| `especialista_seguridad@marina.gov`    | Especialista en Seguridad    |
| `capitan@marina.gov`                   | Capitán de Base              |

**Contraseña para todos:** `Marina.2026`

Cada rol ve un menú distinto según sus permisos.

---

## 7. El día a día

Una vez hecha la instalación, cada vez que te sientes a trabajar son solo tres pasos:

1. **Inicia MySQL** en el XAMPP Control Panel.
2. **Terminal 1**, en `marine-fleet-backend`:

```bash
npm run start:dev
```

3. **Terminal 2**, en `marine-fleet-frontend`:

```bash
npm run dev
```

Y abre `http://localhost:5173`.

Para detener cualquiera de los dos servidores, pulsa `Ctrl + C` en su terminal.

Los pasos de instalación (`npm install`, `.env`, `migration:run`, `seed`) **no se repiten**,
salvo que alguien agregue dependencias o migraciones nuevas. En ese caso, después de un
`git pull`, vuelve a correr:

```bash
npm install && npm run migration:run
```

---

## 8. Problemas frecuentes

**`ECONNREFUSED` o el backend no arranca y menciona la base de datos**
MySQL no está encendido. Abre el XAMPP Control Panel y pulsa **Start** en MySQL.

**`Access denied for user 'root'@'localhost'`**
El usuario o la contraseña de `.env` no coinciden con los de tu MySQL. Revisa `DB_USER` y
`DB_PASSWORD`.

**`Unknown database 'marina_inteligencia'`**
Falta el paso 3.2: crea la base vacía en phpMyAdmin.

**El backend se cierra nada más arrancar mencionando `JWT_SECRET`**
Las claves de `.env` son demasiado cortas. Deben tener mínimo 32 caracteres.

**`Port 3000 is already in use` o `Port 5173 is already in use`**
Ya tienes ese servidor corriendo en otra terminal. Ciérrala, o busca y cierra el proceso.

**La página carga pero no muestra datos**
Falta el backend. Comprueba que la terminal 1 siga corriendo y entra a
`http://localhost:3000/api/docs` para confirmarlo.

**MySQL no arranca en XAMPP y se apaga solo**
Normalmente es que el puerto 3306 está ocupado por otra instalación de MySQL. Ciérrala desde
los servicios de Windows, o cambia el puerto en XAMPP y actualiza `DB_PORT` en el `.env`.

**`npm install` falla**
Comprueba que tienes Node 22 o superior con `node -v`. Si el error persiste, borra la carpeta
`node_modules` y el archivo `package-lock.json` y vuelve a intentarlo.
