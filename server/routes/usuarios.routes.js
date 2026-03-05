const router = require('express').Router();
const ctrl   = require('../controllers/usuarios.controller');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

router.use(verifyToken);

// Ruta propia del usuario autenticado (cualquier rol)
router.get('/mis-areas', ctrl.getMisAreas);

// Gestión de usuarios – solo admin
router.use(requireAdmin);
router.get ('/',      ctrl.getAll);
router.post('/',      ctrl.create);
router.get ('/:id',   ctrl.getById);
router.put ('/:id',   ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
