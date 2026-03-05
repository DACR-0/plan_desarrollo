# SIGEPU – Sistema de Gestión del Plan de Desarrollo Universitario

Sistema web para la gestión, seguimiento y reporte del Plan de Desarrollo Universitario (PDU). Permite administrar objetivos, metas, indicadores y variables con motor de fórmulas integrado y exportación a PDF/Excel.

---

## Requisitos previos

Antes de comenzar, asegúrate de tener instalado:

| Herramienta | Versión mínima | Descarga |
|-------------|----------------|----------|
| Node.js | 18.x o superior | https://nodejs.org |
| npm | 9.x o superior | (incluido con Node.js) |
| MySQL | 8.0 o superior | https://dev.mysql.com/downloads/ |
| Git | cualquier versión | https://git-scm.com |

---

## Estructura del proyecto

```
planes/
├── database.sql              ← Script SQL completo (schema + datos de ejemplo)
├── migration.sql             ← Migración adicional
├── migration_seguimiento.sql ← Migración de seguimiento
├── server/                   ← Backend Node.js + Express
│   ├── config/               ← Configuración de base de datos
│   ├── controllers/          ← Lógica de negocio
│   ├── middleware/           ← Autenticación JWT y roles
│   ├── routes/               ← Definición de endpoints
│   ├── utils/                ← Motor de fórmulas
│   ├── uploads/              ← Archivos subidos
│   ├── .env.example          ← Plantilla de variables de entorno
│   ├── index.js              ← Punto de entrada del servidor
│   └── package.json
├── client/                   ← Frontend React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/       ← Componentes reutilizables
│   │   ├── context/          ← Contextos de React (Auth, Plan)
│   │   ├── pages/            ← Páginas de la aplicación
│   │   └── services/         ← Llamadas a la API
│   └── package.json
└── README.md
```

---

## Instalación paso a paso

### Paso 1 – Clonar el repositorio

```bash
git clone https://github.com/DACR-0/plan_desarrollo.git
cd plan_desarrollo
```

---

### Paso 2 – Configurar la base de datos

1. Abre tu cliente MySQL (terminal, MySQL Workbench, etc.) y ejecuta el script principal:

```bash
mysql -u root -p < database.sql
```

2. Si necesitas las migraciones adicionales, ejecuta en orden:

```bash
mysql -u root -p sigepu < migration.sql
mysql -u root -p sigepu < migration_seguimiento.sql
```

Esto crea la base de datos `sigepu` con todas las tablas e índices necesarios.

**Usuarios de prueba incluidos** (contraseña: `Admin123!`):

| Email | Rol |
|-------|-----|
| admin@universidad.edu | Administrador |
| m.lopez@universidad.edu | Consultor |

---

### Paso 3 – Configurar el Backend

1. Entra a la carpeta del servidor:

```bash
cd server
```

2. Instala las dependencias:

```bash
npm install
```

3. Crea el archivo de variables de entorno copiando la plantilla:

```bash
cp .env.example .env
```

4. Abre el archivo `.env` y edita los valores con tus credenciales:

```env
PORT=3001

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_de_mysql
DB_NAME=sigepu

JWT_SECRET=coloca_aqui_una_clave_larga_y_aleatoria
JWT_EXPIRES_IN=24h

CLIENT_URL=http://localhost:5173
```

> **Importante:** El valor de `JWT_SECRET` debe ser una cadena larga y aleatoria. Puedes generarla con: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

5. Inicia el servidor:

```bash
# Modo desarrollo (reinicio automático con nodemon)
npm run dev

# Modo producción
npm start
```

El backend quedará disponible en: **http://localhost:3001**

---

### Paso 4 – Configurar el Frontend

1. Abre una nueva terminal y entra a la carpeta del cliente:

```bash
cd client
```

2. Instala las dependencias:

```bash
npm install
```

3. Inicia el servidor de desarrollo:

```bash
npm run dev
```

El frontend quedará disponible en: **http://localhost:5173**

---

## Verificar la instalación

1. Abre el navegador en **http://localhost:5173**
2. Inicia sesión con: `admin@universidad.edu` / `Admin123!`
3. Deberías ver el dashboard con los KPIs del plan de desarrollo

---

## Scripts disponibles

### Backend (`server/`)

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia en modo desarrollo con recarga automática |
| `npm start` | Inicia en modo producción |

### Frontend (`client/`)

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo Vite |
| `npm run build` | Genera los archivos de producción en `dist/` |
| `npm run preview` | Previsualiza el build de producción |

---

## Roles de usuario

| Rol | Permisos |
|-----|----------|
| **Administrador** | CRUD completo, gestión de usuarios, actualización de variables, exportación |
| **Consultor** | Solo lectura, visualización de estadísticas, exportación de reportes |

---

## Páginas del sistema

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión |
| `/dashboard` | KPIs, gráficas y avance global |
| `/estructura` | Vista de árbol del PDU (objetivos y metas) |
| `/indicadores` | CRUD de indicadores, recálculo y historial |
| `/metas` | Gestión de metas |
| `/variables` | Actualización de variables (edición en línea) |
| `/reportes` | Exportar reportes en PDF y Excel |
| `/usuarios` | Gestión de usuarios (solo Administrador) |

---

## Solución de problemas comunes

**Error de conexión a la base de datos**
- Verifica que MySQL esté corriendo
- Confirma que las credenciales en `.env` son correctas
- Asegúrate de que la base de datos `sigepu` fue creada correctamente con `database.sql`

**Puerto en uso**
- Si el puerto 3001 está ocupado, cambia `PORT` en `server/.env`
- Si el puerto 5173 está ocupado, Vite asignará automáticamente el siguiente disponible

**Error `Cannot find module`**
- Asegúrate de haber ejecutado `npm install` tanto en `server/` como en `client/`

**CORS bloqueado**
- Verifica que `CLIENT_URL` en `server/.env` coincida exactamente con la URL donde corre el frontend
