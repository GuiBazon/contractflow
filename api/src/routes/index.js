const express = require('express');
const authRoutes = require('./authRoutes');
const clientRoutes = require('./clientRoutes');
const contractRoutes = require('./contractRoutes');
const parcelaRoutes = require('./parcelaRoutes');
const { router: paymentRoutes, allRouter: paymentAllRoutes } = require('./paymentRoutes');
const documentRoutes = require('./documentRoutes');
const ocrRoutes = require('./ocrRoutes');
const usuarioRoutes = require('./usuarioRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/clientes', clientRoutes);
router.use('/contratos', contractRoutes);
router.use('/contracts', contractRoutes);
router.use('/parcelas', parcelaRoutes);
router.use('/installments', parcelaRoutes);
router.use('/pagamentos', paymentRoutes);
router.use('/payments', paymentRoutes);
router.use('/receitas', paymentAllRoutes);
router.use('/documentos', documentRoutes);
router.use('/ocr', ocrRoutes);

module.exports = router;