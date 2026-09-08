const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  extract,
  getExtracao,
  updateExtracao,
  confirmar,
  cancelarExtracao,
} = require('../controllers/ocrController');

const router = express.Router();
router.use(authMiddleware);

router.post('/extract', extract);
router.get('/:id', getExtracao);
router.patch('/:id', updateExtracao);
router.post('/:id/confirmar', confirmar);
router.delete('/:id', cancelarExtracao);

module.exports = router;