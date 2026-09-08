const express = require('express');
const authRoutes = require('./authRoutes');
const clientRoutes = require('./clientRoutes');
const contractRoutes = require('./contractRoutes');
const parcelaRoutes = require('./parcelaRoutes');
const { router: paymentRoutes, allRouter: paymentAllRoutes } = require('./paymentRoutes');
const documentRoutes = require('./documentRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/clientes', clientRoutes);
router.use('/contratos', contractRoutes);
router.use('/parcelas', parcelaRoutes);
router.use('/pagamentos', paymentRoutes);
router.use('/receitas', paymentAllRoutes);
router.use('/documentos', documentRoutes);

module.exports = router;