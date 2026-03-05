# SIGEPU – Sistema de Gestión del Plan de Desarrollo Universitario

## Estructura del proyecto

```
planes/
├── database.sql       ← Script MySQL completo (schema + datos de ejemplo)
├── server/            ← Backend Node.js + Express
└── client/            ← Frontend React + Vite + Tailwind CSS
```

## Requisitos previos

- Node.js ≥ 18
- MySQL ≥ 8.0
- npm o pnpm

---

## 1. Base de datos

```bash
mysql -u root -p < database.sql
```

Esto crea la base de datos `sigepu` con todas las tablas, índices y datos de ejemplo.

**Usuarios de prueba** (contraseña: `Admin123!`):
| Email | Rol |
|-------|-----|
| admin@universidad.edu | Administrador |
| m.lopez@universidad.edu | Consultor |

---

## 2. Backend (server/)

```bash
cd server
npm install
cp .env.example .env          # editar con tus credenciales
npm run dev                   # desarrollo con nodemon
# npm start                   # producción
```

El servidor queda en **http://localhost:3001**

### Variables de entorno (.env)
```
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=sigepu
JWT_SECRET=clave_muy_secreta_larga
JWT_EXPIRES_IN=24h
CLIENT_URL=http://localhost:5173
```

### Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/planes | Listar planes |
| GET | /api/planes/:id/estructura | Árbol completo |
| GET | /api/dashboard/:plan_id | KPIs y gráficas |
| GET/POST | /api/indicadores | Gestión indicadores |
| POST | /api/indicadores/:id/recalcular | Recalcula con fórmula |
| GET/PUT | /api/variables | Gestión de variables |
| POST | /api/variables/actualizar-lote | Actualización masiva |
| GET | /api/reportes/pdf/:plan_id | Exportar PDF |
| GET | /api/reportes/excel/:plan_id | Exportar Excel |

---

## 3. Frontend (client/)

```bash
cd client
npm install
npm run dev                   # http://localhost:5173
```

### Páginas

| Ruta | Descripción |
|------|-------------|
| /login | Autenticación |
| /dashboard | KPIs, gráficas, avance global |
| /estructura | Vista de árbol del PDU |
| /indicadores | CRUD + recálculo + historial |
| /metas | Gestión de metas |
| /variables | Actualización de variables (edición en línea) |
| /reportes | Exportar PDF y Excel |
| /usuarios | Gestión de usuarios (solo Admin) |

---

## Arquitectura

```
Frontend (React)  →  Proxy Vite  →  Backend (Express)  →  MySQL
     JWT en localStorage           API REST /api/**
```

## Motor de fórmulas

Los indicadores usan `mathjs` para evaluar expresiones como:
```
(Graduados_Oportunos / Total_Matriculados) * 100
Pub_Scopus + Pub_WoS
(Prog_Renovados / Total_Programas) * 100
```

Los nombres de variables en la fórmula deben coincidir exactamente
con el campo `nombre` de las variables del indicador en la base de datos.

## Roles

- **Administrador**: CRUD completo, actualización de variables, exportación.
- **Consultor**: Solo lectura, visualización de estadísticas, exportación.
