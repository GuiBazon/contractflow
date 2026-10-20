const router = require('express').Router();
const controller = require('../controllers/notificationController');
const { asyncHandler } = require('../utils/http');

router.use(require('../middlewares/authMiddleware'));
router.get('/', asyncHandler(controller.list));
router.get('/resumo', asyncHandler(controller.summary));
router.patch('/ler-todas', asyncHandler(controller.readAll));
router.patch('/:id/leitura', asyncHandler(controller.read));
router.delete('/:id/leitura', asyncHandler(controller.unread));

module.exports = router;
