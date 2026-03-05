const router  = require('express').Router();
const ctrl    = require('../controllers/solicitudes.controller');
const { verifyToken }  = require('../middleware/auth');
const { requireAdmin, requireRole } = require('../middleware/roles');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// ── Configuración de multer ─────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const ext       = path.extname(file.originalname);
    cb(null, `solicitud_${timestamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|doc|docx|xls|xlsx|png|jpg|jpeg)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido. Use PDF, Word, Excel o imágenes.'));
  },
});

router.use(verifyToken);

// Consultar – admin ve todo, area_estrategica ve las propias
router.get('/',     requireRole('admin','area_estrategica','consultor'), ctrl.getAll);
router.get('/:id',  requireRole('admin','area_estrategica','consultor'), ctrl.getById);

// Crear – solo usuarios de área (y admin)
router.post(
  '/',
  requireRole('admin','area_estrategica'),
  upload.single('documento'),
  ctrl.create
);

// Resolución – solo admin
router.put('/:id/aprobar',  requireAdmin, ctrl.aprobar);
router.put('/:id/rechazar', requireAdmin, ctrl.rechazar);

module.exports = router;
