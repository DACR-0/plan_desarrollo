const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

router.post('/login',           ctrl.login);
router.post('/register',        verifyToken, requireAdmin, ctrl.register);
router.get ('/me',              verifyToken, ctrl.getMe);
router.put ('/change-password', verifyToken, ctrl.changePassword);

module.exports = router;
