const express = require('express');
const {
  listPagamentos,
  createPagamento,
  listAllPagamentos,
  estornarPagamento,
} = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
const allRouter = express.Router();

router.use(authMiddleware);
allRouter.use(authMiddleware);

// Rotas com ID do pagamento direto (ex: PATCH /api/pagamentos/:id/estornar)
router.patch('/:id/estornar', estornarPagamento);
router.patch('/:id/reverse', estornarPagamento);

// Rotas aninhadas por contrato
router.get('/:contratoId/pagamentos', listPagamentos);
router.post('/:contratoId/pagamentos', createPagamento);

// Listagem geral de receitas / pagamentos
allRouter.get('/', listAllPagamentos);
allRouter.patch('/:id/estornar', estornarPagamento);
allRouter.patch('/:id/reverse', estornarPagamento);

module.exports = { router, allRouter };