const express = require('express');
const authRoutes = require('./authRoutes');
const clientRoutes = require('./clientRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/clientes', clientRoutes);

module.exports = router;
