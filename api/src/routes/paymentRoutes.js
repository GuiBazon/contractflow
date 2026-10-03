const express = require('express');
const {
  listPagamentos,
  createPagamento,
  listAllPagamentos,
} = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
const allRouter = express.Router();

router.use(authMiddleware);
allRouter.use(authMiddleware);

// Compatibilidade com o cliente Web da Sprint 1.
router.get('/', listAllPagamentos);
router.get('/:contratoId/pagamentos', listPagamentos);
router.post('/:contratoId/pagamentos', createPagamento);

allRouter.get('/', listAllPagamentos);

module.exports = { router, allRouter };
