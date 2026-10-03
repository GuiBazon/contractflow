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
const { asyncHandler } = require('../utils/http');
router.use(authMiddleware);

router.post('/extract', extract);
router.get('/:id', asyncHandler(getExtracao));
router.patch('/:id', asyncHandler(updateExtracao));
router.post('/:id/confirmar', asyncHandler(confirmar));
router.delete('/:id', asyncHandler(cancelarExtracao));

module.exports = router;
