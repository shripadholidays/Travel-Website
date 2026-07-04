const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const authorize = require('../middlewares/authorize');
const { getProfile, updateProfile } = require('../controllers/UserController');

const router = express.Router();

router.get('/profile', isLoggedIn, authorize('user', 'moderator', 'admin'), getProfile);
router.patch('/profile', isLoggedIn, authorize('user', 'moderator', 'admin'), updateProfile);

module.exports = router;
