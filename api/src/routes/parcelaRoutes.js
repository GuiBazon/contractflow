const express = require('express');
const {
  listParcelas,
  updateParcela,
  bulkPayParcelas,
} = require('../controllers/parcelaController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Rotas de baixa em lote (Bulk Actions)
router.post('/bulk-pay', bulkPayParcelas);
router.post('/pagar-lote', bulkPayParcelas);
router.post('/:contratoId/bulk-pay', bulkPayParcelas);
router.post('/:contratoId/parcelas/bulk-pay', bulkPayParcelas);

// Rotas tradicionais de parcelas
router.get('/:contratoId/parcelas', listParcelas);
router.patch('/:contratoId/parcelas/:parcelaId', updateParcela);

module.exports = router;