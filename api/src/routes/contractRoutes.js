const express = require('express');
const {
  listContratos,
  getContratoById,
  createContrato,
  updateContrato,
  updateContratoStatus,
  generateParcelas,
  deleteContrato,
  getHistorico,
} = require('../controllers/contractController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', listContratos);
router.get('/:id', getContratoById);
router.post('/', createContrato);
router.put('/:id', updateContrato);
router.delete('/:id', deleteContrato);
router.patch('/:id/status', updateContratoStatus);
router.post('/:id/parcelas', generateParcelas);
router.get('/:id/historico', getHistorico);

module.exports = router;