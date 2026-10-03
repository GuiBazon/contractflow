const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
router.use(require('../middlewares/authMiddleware'));
router.get('/:tipo', asyncHandler(require('../controllers/reportController').get));
module.exports = router;
