const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

// ── Middlewares ────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Archivos estáticos (documentos adjuntos) ───────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rutas ──────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/planes',      require('./routes/planes.routes'));
app.use('/api/areas',       require('./routes/areas.routes'));
app.use('/api/objetivos',   require('./routes/objetivos.routes'));
app.use('/api/metas',       require('./routes/metas.routes'));
app.use('/api/indicadores', require('./routes/indicadores.routes'));
app.use('/api/variables',   require('./routes/variables.routes'));
app.use('/api/usuarios',    require('./routes/usuarios.routes'));
app.use('/api/dashboard',   require('./routes/dashboard.routes'));
app.use('/api/reportes',    require('./routes/reportes.routes'));
app.use('/api/periodos',    require('./routes/periodos.routes'));
app.use('/api/solicitudes', require('./routes/solicitudes.routes'));

// ── Health check ───────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'OK', timestamp: new Date() })
);

// ── Manejador de errores global ────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`\n🚀  SIGEPU Backend corriendo en http://localhost:${PORT}\n`)
);

module.exports = app;
