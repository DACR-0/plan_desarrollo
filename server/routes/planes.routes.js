const router = require('express').Router();
const ctrl   = require('../controllers/planes.controller');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

router.use(verifyToken);

router.get ('/',                  ctrl.getAll);
router.post('/',                  requireAdmin, ctrl.create);
router.get ('/:id',               ctrl.getById);
router.put ('/:id',               requireAdmin, ctrl.update);
router.delete('/:id',             requireAdmin, ctrl.remove);
router.put ('/:id/activar',        requireAdmin, ctrl.activar);
router.get ('/:id/estructura',    ctrl.getEstructura);
router.get ('/:id/dashboard',     ctrl.getDashboard);

module.exports = router;
