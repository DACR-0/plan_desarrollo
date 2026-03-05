const router = require('express').Router();
const ctrl   = require('../controllers/dashboard.controller');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/:plan_id', ctrl.getDashboard);

module.exports = router;
