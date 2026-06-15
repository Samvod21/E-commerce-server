const express = require('express');
const { signup, login, getMe } = require('../Controller/authController');
const { protect } = require('../Middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Private routes
router.get('/me', protect, getMe);

module.exports = router;
