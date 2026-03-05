const router = require('express').Router();
const ctrl   = require('../controllers/objetivos.controller');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

router.use(verifyToken);

// Objetivos Generales
router.get ('/generales',      ctrl.getAllGenerales);
router.post('/generales',      requireAdmin, ctrl.createGeneral);
router.get ('/generales/:id',  ctrl.getGeneralById);
router.put ('/generales/:id',  requireAdmin, ctrl.updateGeneral);
router.delete('/generales/:id',requireAdmin, ctrl.removeGeneral);

// Objetivos Específicos
router.get ('/especificos',       ctrl.getAllEspecificos);
router.post('/especificos',       requireAdmin, ctrl.createEspecifico);
router.get ('/especificos/:id',   ctrl.getEspecificoById);
router.put ('/especificos/:id',   requireAdmin, ctrl.updateEspecifico);
router.delete('/especificos/:id', requireAdmin, ctrl.removeEspecifico);

module.exports = router;
