const router = require('express').Router();
const ctrl   = require('../controllers/indicadores.controller');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

router.use(verifyToken);

router.get ('/',              ctrl.getAll);
router.post('/',              requireAdmin, ctrl.create);
router.get ('/:id',           ctrl.getById);
router.put ('/:id',           requireAdmin, ctrl.update);
router.delete('/:id',         requireAdmin, ctrl.remove);
router.post('/:id/recalcular',requireAdmin, ctrl.recalculate);
router.get ('/:id/historico', ctrl.getHistorico);

module.exports = router;
