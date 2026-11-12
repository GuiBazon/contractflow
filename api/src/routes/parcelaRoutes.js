const express = require('express');
const { listParcelas, updateParcela, bulkPayParcelas } = require('../controllers/parcelaController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/bulk-pay', bulkPayParcelas);
router.get('/:contratoId/parcelas', listParcelas);
router.patch('/:contratoId/parcelas/:parcelaId', updateParcela);

module.exports = router;