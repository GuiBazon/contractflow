const express = require('express');
const { register, login, changePassword, logout } = require('../controllers/authController');
const auth = require('../middlewares/authMiddleware');
const { asyncHandler } = require('../utils/http');
const { authRateLimits } = require('../middlewares/authRateLimit');
const recovery = require('../controllers/passwordRecoveryController');

const router = express.Router();

router.post('/register', ...authRateLimits.register, asyncHandler(register));
router.post('/login', ...authRateLimits.login, asyncHandler(login));
router.post('/forgot-password', ...authRateLimits.forgotPassword, asyncHandler(recovery.forgot));
router.post('/reset-password', ...authRateLimits.resetPassword, asyncHandler(recovery.reset));
router.get('/me', auth, (req,res) => res.json({ usuario: req.user }));
router.patch('/password', auth, asyncHandler(changePassword));
router.post('/logout', auth, asyncHandler(logout));

module.exports = router;
