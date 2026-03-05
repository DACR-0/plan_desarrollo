const router = require('express').Router();
const ctrl   = require('../controllers/periodos.controller');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

router.use(verifyToken);

// Consulta disponible para todos los usuarios autenticados
router.get('/',        ctrl.getAll);
router.get('/activo',  ctrl.getPeriodoActivo);

// Gestión solo para admin
router.post('/',                   requireAdmin, ctrl.create);
router.put('/:id',                 requireAdmin, ctrl.update);
router.put('/:id/activar',         requireAdmin, ctrl.activar);
router.put('/:id/cerrar',          requireAdmin, ctrl.cerrar);

module.exports = router;
