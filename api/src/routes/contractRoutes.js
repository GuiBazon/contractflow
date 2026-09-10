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
const {
  listParcelas,
  updateParcela,
} = require('../controllers/parcelaController');
const {
  listPagamentos,
  createPagamento,
} = require('../controllers/paymentController');
const {
  uploadDocumento,
  listDocumentos,
  downloadDocumento,
  deleteDocumento,
} = require('../controllers/documentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Contratos
router.get('/', listContratos);
router.post('/', createContrato);
router.get('/:id', getContratoById);
router.put('/:id', updateContrato);
router.patch('/:id/status', updateContratoStatus);
router.post('/:id/parcelas', generateParcelas);
router.get('/:id/historico', getHistorico);
router.delete('/:id', deleteContrato);

// Parcelas (aninhadas por contrato)
router.get('/:contratoId/parcelas', listParcelas);
router.patch('/:contratoId/parcelas/:parcelaId', updateParcela);

// Pagamentos (aninhados por contrato)
router.get('/:contratoId/pagamentos', listPagamentos);
router.post('/:contratoId/pagamentos', createPagamento);

// Documentos (aninhados por contrato)
router.get('/:contratoId/documentos', listDocumentos);
router.post('/:contratoId/documentos', uploadDocumento);
router.get('/:contratoId/documentos/:documentoId/arquivo', downloadDocumento);
router.delete('/:contratoId/documentos/:documentoId', deleteDocumento);

module.exports = router;