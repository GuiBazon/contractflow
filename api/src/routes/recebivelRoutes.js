const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
router.use(require('../middlewares/authMiddleware'));
router.get('/', asyncHandler(require('../controllers/recebivelController').list));
module.exports = router;
