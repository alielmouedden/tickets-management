// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Routes publiques
router.post('/register', register);
router.post('/login', login);

// Route protégée (nécessite un token)
router.get('/profile', verifyToken, getProfile);

module.exports = router;