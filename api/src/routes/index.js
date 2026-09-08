const express = require('express');
const authRoutes = require('./authRoutes');
const clientRoutes = require('./clientRoutes');
const contractRoutes = require('./contractRoutes');
const paymentAllRoutes = require('./paymentAllRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/clientes', clientRoutes);
router.use('/contratos', contractRoutes);
router.use('/pagamentos', paymentAllRoutes);

module.exports = router;