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

// Rotas canônicas; os formatos planos usados pelo Mobile continuam disponíveis.
const { listParcelas, updateParcela } = require('../controllers/parcelaController');
const { listPagamentos, createPagamento } = require('../controllers/paymentController');
const docs = require('../controllers/documentController');
router.get('/:contratoId/parcelas', listParcelas);
router.patch('/:contratoId/parcelas/:parcelaId', updateParcela);
router.get('/:contratoId/pagamentos', listPagamentos);
router.post('/:contratoId/pagamentos', createPagamento);
router.get('/:contratoId/documentos', docs.listDocumentos);
router.post('/:contratoId/documentos', docs.uploadDocumento);
router.get('/:contratoId/documentos/:documentoId/arquivo', docs.downloadDocumento);
router.delete('/:contratoId/documentos/:documentoId', docs.deleteDocumento);

router.get('/', listContratos);
router.get('/:id', getContratoById);
router.post('/', createContrato);
router.put('/:id', updateContrato);
router.delete('/:id', deleteContrato);
router.patch('/:id/status', updateContratoStatus);
router.post('/:id/parcelas', generateParcelas);
router.get('/:id/historico', getHistorico);

module.exports = router;
