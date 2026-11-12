const router = require('express').Router();
const { asyncHandler } = require('../utils/http');
router.use(require('../middlewares/authMiddleware'));
router.get('/', asyncHandler(require('../controllers/dashboardController').get));
module.exports = router;
