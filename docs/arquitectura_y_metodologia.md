# SIGEPU — Sistema de Gestión del Plan de Desarrollo Universitario
## Documento de Arquitectura y Metodología

**Versión:** 1.0
**Fecha:** Febrero 2026
**Clasificación:** Documentación Técnica Interna

---

## Tabla de Contenidos

1. [Descripción General del Sistema](#1-descripción-general-del-sistema)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Estructura de Carpetas](#4-estructura-de-carpetas)
5. [Modelo de Datos](#5-modelo-de-datos)
6. [Capa de Backend](#6-capa-de-backend)
7. [Capa de Frontend](#7-capa-de-frontend)
8. [Seguridad y Autenticación](#8-seguridad-y-autenticación)
9. [Motor de Fórmulas](#9-motor-de-fórmulas)
10. [API REST — Referencia de Endpoints](#10-api-rest--referencia-de-endpoints)
11. [Metodología de Desarrollo](#11-metodología-de-desarrollo)
12. [Decisiones de Diseño](#12-decisiones-de-diseño)

---

## 1. Descripción General del Sistema

**SIGEPU** es una aplicación web orientada a la gestión y seguimiento del Plan de Desarrollo Institucional de una universidad. Permite a los equipos directivos y de planificación:

- Crear y gestionar Planes de Desarrollo con períodos definidos.
- Organizar la estructura jerárquica del plan: Áreas Estratégicas → Objetivos Generales → Objetivos Específicos → Metas → Indicadores.
- Definir indicadores con **fórmulas matemáticas** que se evalúan automáticamente a partir de variables configurables.
- Monitorear el cumplimiento mediante un **tablero de control** con gráficas y semáforos (verde / amarillo / rojo).
- Exportar reportes en **PDF** y **Excel**.
- Gestionar usuarios con dos niveles de acceso: Administrador y Consultor.
- Mantener un **historial de auditoría** de cambios en variables y cálculos de indicadores.

---

## 2. Arquitectura del Sistema

El sistema sigue una arquitectura de **tres capas clásica** (presentación – lógica de negocio – datos), implementada como aplicación web con separación completa entre frontend y backend.

```
┌─────────────────────────────────────────────────────┐
│                 NAVEGADOR WEB                       │
│                                                     │
│   ┌─────────────────────────────────────────────┐  │
│   │  React 18 + Vite  (http://localhost:5173)   │  │
│   │  Tailwind CSS · Chart.js · React Router     │  │
│   └───────────────────┬─────────────────────────┘  │
│                       │  HTTP/JSON (Axios)          │
│                       │  Authorization: Bearer JWT  │
└───────────────────────┼─────────────────────────────┘
                        │
        ┌───────────────▼──────────────────┐
        │   Vite Dev Proxy  /api → :3001   │  (solo desarrollo)
        └───────────────┬──────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                 SERVIDOR BACKEND                     │
│         Node.js + Express  (http://localhost:3001)   │
│                                                     │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │  Rutas     │  │Controllers │  │  Middleware  │  │
│  │  /api/*    │→ │  Lógica   │  │  JWT · Roles │  │
│  └────────────┘  └─────┬──────┘  └──────────────┘  │
│                        │                            │
│             ┌──────────▼───────────┐               │
│             │  formulaEngine.js    │               │
│             │  (mathjs evaluation) │               │
│             └──────────┬───────────┘               │
└────────────────────────┼────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│                  BASE DE DATOS                       │
│              MySQL 8.0  ·  sigepu                   │
│          Pool de 10 conexiones (mysql2)              │
└─────────────────────────────────────────────────────┘
```

### Flujo de una solicitud típica

```
1. El usuario interactúa con la interfaz React.
2. Axios envía la petición HTTP con el header Authorization: Bearer <JWT>.
3. Express recibe la petición en la ruta correspondiente.
4. El middleware verifyToken valida el JWT.
5. El middleware requireAdmin verifica el rol (si aplica).
6. El controlador ejecuta la lógica de negocio y consulta MySQL.
7. La respuesta JSON regresa al frontend.
8. React actualiza el estado y renderiza la vista.
```

---

## 3. Stack Tecnológico

### Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18.2 | Librería de UI con hooks y componentes funcionales |
| Vite | 5.2 | Build tool con HMR y proxy de API |
| React Router DOM | 6.22 | Enrutamiento del lado del cliente (SPA) |
| Tailwind CSS | 3.4 | Estilos utilitarios con tema personalizado |
| Axios | 1.6 | Cliente HTTP con interceptores JWT |
| Chart.js + react-chartjs-2 | 4.4 | Gráficas de barra, dona y línea |
| Lucide React | 0.359 | Iconografía SVG |
| React Hot Toast | 2.4 | Notificaciones toast |

### Backend

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | ≥ 18 | Entorno de ejecución |
| Express | 4.18 | Framework HTTP y router |
| mysql2 | 3.9 | Driver MySQL con pool y Promises |
| jsonwebtoken | 9.0 | Generación y verificación de JWT |
| bcryptjs | 2.4 | Hash de contraseñas (cost 10) |
| mathjs | 12.4 | Evaluación de fórmulas matemáticas |
| PDFKit | 0.14 | Generación de reportes en PDF |
| ExcelJS | 4.4 | Generación de reportes en Excel |
| multer | 2.0 | Manejo de carga de archivos |
| cors | 2.8 | Política de origen cruzado |
| dotenv | 16.4 | Variables de entorno |

### Base de Datos

| Tecnología | Versión | Detalle |
|---|---|---|
| MySQL | 8.0 | Motor relacional principal |
| Charset | utf8mb4_unicode_ci | Soporte completo Unicode |
| Pool | 10 conexiones | Gestionado por mysql2/promise |

---

## 4. Estructura de Carpetas

```
planes/
├── docs/                          ← Documentación del proyecto
│   ├── arquitectura_y_metodologia.md
│   └── manual_usuario.md
├── database.sql                   ← Esquema completo + datos de prueba
├── migration.sql                  ← Scripts de migración
├── migration_seguimiento.sql
│
├── server/                        ← Backend Node.js
│   ├── index.js                  ← Punto de entrada; configura Express
│   ├── package.json
│   ├── .env                      ← Variables de entorno (no en Git)
│   │
│   ├── config/
│   │   └── db.js                 ← Pool de conexiones MySQL
│   │
│   ├── middleware/
│   │   ├── auth.js               ← Verifica JWT
│   │   └── roles.js              ← Verifica rol admin
│   │
│   ├── routes/                   ← Definición de rutas Express
│   │   ├── auth.routes.js
│   │   ├── planes.routes.js
│   │   ├── areas.routes.js
│   │   ├── objetivos.routes.js
│   │   ├── metas.routes.js
│   │   ├── indicadores.routes.js
│   │   ├── variables.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── reportes.routes.js
│   │   ├── usuarios.routes.js
│   │   ├── periodos.routes.js
│   │   └── solicitudes.routes.js
│   │
│   ├── controllers/              ← Lógica de negocio
│   │   ├── auth.controller.js
│   │   ├── planes.controller.js
│   │   ├── areas.controller.js
│   │   ├── objetivos.controller.js
│   │   ├── metas.controller.js
│   │   ├── indicadores.controller.js
│   │   ├── variables.controller.js
│   │   ├── dashboard.controller.js
│   │   └── reportes.controller.js
│   │
│   ├── utils/
│   │   └── formulaEngine.js      ← Motor de evaluación de fórmulas
│   │
│   └── uploads/                  ← Archivos subidos por el sistema
│
└── client/                        ← Frontend React
    ├── package.json
    ├── vite.config.js             ← Proxy /api → :3001
    ├── tailwind.config.js
    │
    └── src/
        ├── main.jsx               ← Punto de entrada React
        ├── App.jsx                ← Definición de rutas y guards
        │
        ├── context/
        │   ├── AuthContext.jsx    ← Estado global de autenticación
        │   └── PlanContext.jsx    ← Plan activo seleccionado
        │
        ├── services/
        │   └── api.js             ← Instancia Axios + interceptores
        │
        ├── components/            ← Componentes reutilizables
        │   ├── Layout.jsx
        │   ├── Sidebar.jsx
        │   ├── TopBar.jsx
        │   ├── Modal.jsx
        │   ├── KpiCard.jsx
        │   └── ProgressBar.jsx
        │
        └── pages/                 ← Vistas principales
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Estructura.jsx
            ├── Planes.jsx
            ├── Indicadores.jsx
            ├── Metas.jsx
            ├── Variables.jsx
            ├── Reportes.jsx
            ├── Usuarios.jsx
            ├── Periodos.jsx
            └── Solicitudes.jsx
```

---

## 5. Modelo de Datos

### Jerarquía del Plan

El modelo central sigue una relación padre-hijo en cascada de cinco niveles:

```
planes
  └── areas_estrategicas      (plan_id → planes)
        └── objetivos_generales  (area_id → areas_estrategicas)
              └── objetivos_especificos  (objetivo_general_id)
                    └── metas            (objetivo_especifico_id)
                          └── indicadores  (meta_id → metas)
```

### Tablas Principales

#### `usuarios`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK | Identificador único |
| nombre | VARCHAR(255) | Nombre completo |
| email | VARCHAR(255) UNIQUE | Correo electrónico (usado como login) |
| password_hash | VARCHAR(255) | Hash bcrypt (cost 10) |
| rol | ENUM('admin','consultor') | Nivel de acceso |
| activo | BOOLEAN | Estado de la cuenta |
| ultimo_acceso | TIMESTAMP | Fecha del último login |

#### `planes`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK | Identificador único |
| nombre | VARCHAR(500) | Nombre del plan |
| anio_inicio / anio_fin | INT | Período de vigencia |
| activo | BOOLEAN | Soft delete |
| vigente | BOOLEAN | Solo uno puede ser `true` a la vez |
| created_by | INT FK | Usuario que creó el plan |

#### `indicadores`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK | Identificador único |
| meta_id | INT FK | Meta a la que pertenece |
| nombre | VARCHAR(500) | Nombre descriptivo |
| formula | TEXT | Expresión matemática, ej.: `(V1 / V2) * 100` |
| valor_actual | DECIMAL(15,4) | Último valor calculado |
| porcentaje_cumplimiento | DECIMAL(7,2) | % respecto a la meta |
| linea_base | DECIMAL(15,4) | Valor de partida |
| valor_meta | DECIMAL(15,4) | Valor objetivo |
| periodo_calculo | VARCHAR(50) | anual / semestral / trimestral |

#### `variables`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK | Identificador único |
| plan_id | INT FK | Alcance del plan |
| nombre | VARCHAR(100) | Nombre usado en fórmulas (único por plan) |
| valor_actual | DECIMAL(15,4) | Valor numérico actual |
| unidad | VARCHAR(100) | Unidad de medida |

> **Restricción clave:** `UNIQUE KEY (plan_id, nombre)` — no pueden existir dos variables con el mismo nombre dentro del mismo plan.

#### Tablas de Auditoría

**`variable_historico`** — registra cada cambio de valor de una variable:
- `variable_id`, `valor`, `periodo`, `usuario_id`, `observacion`, `created_at`

**`indicador_historico`** — captura el estado de un indicador al momento del cálculo:
- `indicador_id`, `valor_calculado`, `porcentaje_cumplimiento`, `periodo`, `snapshot_variables` (JSON), `created_at`

---

## 6. Capa de Backend

### Organización Express

```
index.js
├── Middlewares globales: cors, json, urlencoded
├── Rutas estáticas: /uploads
└── Montaje de rutas: /api/auth, /api/planes, /api/indicadores, ...
```

### Patrón Routes → Controllers

Cada módulo de negocio sigue el mismo patrón:

```
routes/indicadores.routes.js
  → GET  /api/indicadores              → indicadores.controller.getAll
  → POST /api/indicadores              → indicadores.controller.create
  → GET  /api/indicadores/:id          → indicadores.controller.getById
  → PUT  /api/indicadores/:id          → indicadores.controller.update
  → DELETE /api/indicadores/:id        → indicadores.controller.remove
  → POST /api/indicadores/:id/recalcular → indicadores.controller.recalculate
  → GET  /api/indicadores/:id/historico  → indicadores.controller.getHistory
```

### Middleware de Seguridad

```javascript
// middleware/auth.js
verifyToken(req, res, next)
  → Lee header: "Authorization: Bearer <token>"
  → Verifica con jwt.verify(token, SECRET)
  → Si válido: req.user = { id, email, rol, nombre }
  → Si inválido/expirado: 401 Unauthorized

// middleware/roles.js
requireAdmin(req, res, next)
  → Verifica req.user.rol === 'admin'
  → Si no es admin: 403 Forbidden
```

### Pool de Base de Datos

```javascript
// config/db.js
mysql.createPool({
  host, user, password,
  database: 'sigepu',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4'
})
```

---

## 7. Capa de Frontend

### Gestión de Estado Global

El frontend usa el **Context API** de React con dos proveedores:

**`AuthContext`**
- Almacena: `{ user, token, isAdmin }`
- Funciones: `login(email, password)`, `logout()`
- Persiste el token en `localStorage`

**`PlanContext`**
- Almacena: `{ planes, activePlan }`
- Permite cambiar el plan activo sin recargar la página
- El `plan_id` activo se pasa a todas las consultas de datos

### Interceptores Axios (`services/api.js`)

```javascript
// Interceptor de request: agrega el JWT
config.headers.Authorization = `Bearer ${token}`

// Interceptor de response: maneja expiración
if (status === 401 || status === 403) {
  localStorage.removeItem('token')
  window.location.href = '/login'
}
```

### Guards de Rutas

```jsx
// App.jsx
<PrivateRoute>   → requiere estar autenticado
<AdminRoute>     → requiere rol === 'admin'
```

Si el usuario no cumple el requisito, es redirigido a `/login`.

### Páginas Principales

| Página | Ruta | Descripción |
|---|---|---|
| Login | `/login` | Formulario de acceso |
| Dashboard | `/dashboard` | KPIs, gráficas, semáforos |
| Estructura | `/estructura` | Árbol jerárquico del plan |
| Planes | `/planes` | CRUD de planes (admin) |
| Indicadores | `/indicadores` | CRUD + recálculo de indicadores |
| Variables | `/variables` | Edición inline + actualización por lote |
| Metas | `/metas` | Gestión de metas |
| Reportes | `/reportes` | Exportar PDF / Excel |
| Usuarios | `/usuarios` | Gestión de usuarios (admin) |
| Periodos | `/periodos` | Períodos de seguimiento (admin) |
| Solicitudes | `/solicitudes` | Seguimiento de solicitudes |

---

## 8. Seguridad y Autenticación

### Flujo de Autenticación

```
1. POST /api/auth/login  { email, password }
2. Server: bcrypt.compare(password, hash) en DB
3. Si correcto: jwt.sign({ id, email, rol, nombre }, SECRET, { expiresIn: '24h' })
4. Client: almacena token en localStorage
5. Todas las peticiones: Authorization: Bearer <token>
6. Server: jwt.verify(token, SECRET) en middleware
7. Expiración a las 24h → auto-logout
```

### Niveles de Acceso

| Operación | Administrador | Consultor |
|---|:---:|:---:|
| Ver dashboard, estructura, reportes | ✓ | ✓ |
| Ver indicadores, variables, metas | ✓ | ✓ |
| Crear / editar / eliminar registros | ✓ | ✗ |
| Activar plan | ✓ | ✗ |
| Gestionar usuarios | ✓ | ✗ |
| Gestionar períodos | ✓ | ✗ |
| Recalcular indicadores | ✓ | ✗ |
| Actualizar variables por lote | ✓ | ✗ |

### Consideraciones de Seguridad

- Contraseñas almacenadas solo como hash bcrypt (nunca en texto plano).
- El JWT no contiene información sensible más allá de rol e identificador.
- CORS restringido al origen del frontend (`http://localhost:5173`).
- Las rutas de administración aplican doble validación: token + rol.

---

## 9. Motor de Fórmulas

El archivo `server/utils/formulaEngine.js` encapsula la lógica de evaluación de indicadores usando la librería **mathjs**.

### Funciones Principales

```javascript
// Evalúa una fórmula con un mapa de variables
evaluateFormula(formula, variables)
// Ejemplo: evaluateFormula("(Graduados / Total) * 100", { Graduados: 50, Total: 60 })
// Resultado: 83.33

// Calcula el porcentaje de cumplimiento
calculateCompliance(valorActual, valorMeta, lineaBase)
// Fórmula: (actual - baseline) / (target - baseline) * 100

// Determina el estado semáforo del indicador
getStatus(porcentajeCumplimiento)
// ≥ 90% → 'en_meta'   (Verde)
// 50-89% → 'en_progreso' (Amarillo)
// < 50%  → 'en_riesgo'  (Rojo)

// Valida que una fórmula es parseble antes de guardar
validateFormula(formula, nombresDeVariables)
// Retorna: { valid: true/false, error: string }
```

### Ciclo de Vida de un Indicador

```
1. Admin crea indicador con fórmula: "(V1 / V2) * 100"
2. Sistema valida la fórmula con validateFormula()
3. Admin actualiza variables: V1=50, V2=60
4. Sistema guarda cambio en variable_historico
5. Admin (o sistema) solicita recálculo: POST /api/indicadores/:id/recalcular
6. formulaEngine.evaluateFormula("(V1/V2)*100", {V1:50,V2:60}) → 83.33
7. formulaEngine.calculateCompliance(83.33, 100, 0) → 83.33%
8. formulaEngine.getStatus(83.33) → 'en_progreso'
9. Sistema actualiza indicador y guarda snapshot en indicador_historico
```

---

## 10. API REST — Referencia de Endpoints

Todos los endpoints requieren header `Authorization: Bearer <JWT>` salvo `POST /api/auth/login`.

### Autenticación
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | No | Iniciar sesión |
| POST | `/api/auth/register` | Admin | Registrar usuario |
| GET | `/api/auth/me` | Sí | Perfil del usuario actual |
| PUT | `/api/auth/change-password` | Sí | Cambiar contraseña |

### Planes
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/planes` | Sí | Listar todos los planes activos |
| POST | `/api/planes` | Admin | Crear nuevo plan |
| PUT | `/api/planes/:id` | Admin | Actualizar plan |
| DELETE | `/api/planes/:id` | Admin | Desactivar plan (soft delete) |
| PUT | `/api/planes/:id/activar` | Admin | Marcar plan como vigente |
| GET | `/api/planes/:id/estructura` | Sí | Árbol completo del plan |

### Indicadores
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/indicadores` | Sí | Listar indicadores (filtro: plan_id, meta_id) |
| POST | `/api/indicadores` | Admin | Crear indicador |
| GET | `/api/indicadores/:id` | Sí | Detalle + variables disponibles |
| PUT | `/api/indicadores/:id` | Admin | Actualizar indicador |
| DELETE | `/api/indicadores/:id` | Admin | Desactivar indicador |
| POST | `/api/indicadores/:id/recalcular` | Admin | Recalcular con fórmula |
| GET | `/api/indicadores/:id/historico` | Sí | Historial de cálculos |

### Variables
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/variables` | Sí | Listar variables (requerido: plan_id) |
| POST | `/api/variables` | Admin | Crear variable |
| PUT | `/api/variables/:id` | Admin | Actualizar valor |
| DELETE | `/api/variables/:id` | Admin | Desactivar variable |
| POST | `/api/variables/actualizar-lote` | Admin | Actualización masiva + recálculo |
| GET | `/api/variables/historico/:id` | Sí | Historial de cambios |

### Dashboard y Reportes
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/dashboard/:plan_id` | Sí | KPIs, gráficas, top/riesgo |
| GET | `/api/reportes/pdf/:plan_id` | Sí | Exportar reporte PDF |
| GET | `/api/reportes/excel/:plan_id` | Sí | Exportar reporte Excel |

### Otros módulos
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET/POST | `/api/areas` | Admin/Sí | Áreas estratégicas |
| GET/POST | `/api/objetivos` | Admin/Sí | Objetivos generales y específicos |
| GET/POST | `/api/metas` | Admin/Sí | Metas |
| GET/POST | `/api/usuarios` | Admin | Gestión de usuarios |
| GET | `/api/periodos` | Admin | Períodos de seguimiento |
| GET | `/api/solicitudes` | Sí | Solicitudes de seguimiento |

---

## 11. Metodología de Desarrollo

### Enfoque General

El proyecto fue desarrollado siguiendo principios de **desarrollo incremental**, comenzando por la base de datos y el backend, para luego construir el frontend sobre una API estable.

### Separación de Responsabilidades

- **Backend**: responsable de la integridad de datos, lógica de negocio, cálculos y seguridad.
- **Frontend**: responsable únicamente de la presentación y la interacción del usuario. No realiza cálculos de negocio.
- **Base de datos**: centraliza la persistencia con restricciones de integridad referencial.

### Principios Aplicados

**Convenciones de nombres**
- Base de datos: `snake_case` en español (ej.: `areas_estrategicas`, `porcentaje_cumplimiento`)
- JavaScript: `camelCase` en inglés para variables y funciones
- Componentes React: `PascalCase`

**Soft Delete**
Las entidades no se eliminan físicamente. Se usa el campo `activo = false` (o `vigente = false` para planes) para preservar el historial.

**Un plan vigente a la vez**
La activación de un plan desactiva automáticamente todos los demás, garantizando un único punto de referencia activo en el sistema.

**Auditoría obligatoria**
Todo cambio en variables e indicadores genera un registro histórico con timestamp, usuario y valores anteriores/nuevos.

**Validación en doble capa**
Los datos se validan tanto en el frontend (UX inmediata) como en el backend (integridad garantizada), nunca solo en uno.

---

## 12. Decisiones de Diseño

### ¿Por qué React + Vite sobre un framework completo (Next.js)?

El sistema es una **aplicación de intranet** con usuarios autenticados. No requiere SSR (Server-Side Rendering) ni SEO público. React + Vite ofrece una experiencia de desarrollo más rápida y un bundle más pequeño para este caso de uso.

### ¿Por qué JWT en localStorage?

Para una aplicación de intranet con sesiones de 24h, localStorage simplifica la implementación. En un contexto de mayor exposición pública se recomienda migrar a cookies HttpOnly.

### ¿Por qué mathjs para las fórmulas?

mathjs provee evaluación segura de expresiones matemáticas con soporte de scope de variables, lo que permite a los administradores definir fórmulas complejas sin necesidad de código personalizado.

### ¿Por qué variables con alcance de plan?

Las variables son recursos compartidos dentro del plan para evitar duplicación. Un cambio en una variable puede afectar múltiples indicadores, y el sistema recalcula todos automáticamente.

### ¿Por qué PDFKit y ExcelJS en el backend?

La generación de archivos en el servidor garantiza consistencia del formato independientemente del navegador del cliente, y permite incrustar datos sensibles sin exponerlos al frontend.

---

*Fin del documento de arquitectura y metodología.*
