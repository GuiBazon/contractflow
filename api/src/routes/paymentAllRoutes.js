const express = require('express');
const { listAllPagamentos } = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Todos os pagamentos do usuario (RF26 receitas / RF24 recebiveis)
router.get('/', listAllPagamentos);

module.exports = router;