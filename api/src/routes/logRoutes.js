const express = require('express');
const { listLogs, getLogById } = require('../controllers/logController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', listLogs);
router.get('/:id', getLogById);

module.exports = router;
