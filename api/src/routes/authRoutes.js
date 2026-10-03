const express = require('express');
const { register, login, changePassword, logout } = require('../controllers/authController');
const auth = require('../middlewares/authMiddleware');
const { asyncHandler } = require('../utils/http');

const router = express.Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', auth, (req,res) => res.json({ usuario: req.user }));
router.patch('/password', auth, asyncHandler(changePassword));
router.post('/logout', auth, asyncHandler(logout));

module.exports = router;
