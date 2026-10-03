const router = require('express').Router();
const controller = require('../controllers/calculatorController');
router.use(require('../middlewares/authMiddleware'));
router.post('/parcelas', controller.installments);
router.post('/saldo', controller.balance);
router.post('/projecao', controller.projection);
module.exports = router;
