const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const { asyncHandler } = require('../utils/http');
const controller = require('../controllers/profileController');

router.use(auth);
router.get('/', asyncHandler(controller.get));
router.patch('/', asyncHandler(controller.update));
router.get('/foto', asyncHandler(controller.getPhoto));
router.put('/foto', controller.uploadPhoto, asyncHandler(controller.putPhoto));
router.delete('/foto', asyncHandler(controller.deletePhoto));
module.exports = router;
