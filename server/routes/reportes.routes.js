const router = require('express').Router();
const ctrl   = require('../controllers/reportes.controller');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/pdf/:plan_id',   ctrl.exportPDF);
router.get('/excel/:plan_id', ctrl.exportExcel);

module.exports = router;
