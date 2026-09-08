const express = require('express');
const {
  uploadDocumento,
  listDocumentos,
  downloadDocumento,
  deleteDocumento,
} = require('../controllers/documentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/:contratoId/documentos', listDocumentos);
router.post('/:contratoId/documentos', uploadDocumento);
router.get('/:contratoId/documentos/:documentoId/arquivo', downloadDocumento);
router.delete('/:contratoId/documentos/:documentoId', deleteDocumento);

module.exports = router;