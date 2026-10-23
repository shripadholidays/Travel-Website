const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const { getProfile, updateProfile, getWriteEligibility } = require('../controllers/UserController');

const router = express.Router();

router.get('/profile', isLoggedIn, getProfile);
router.patch('/profile', isLoggedIn, updateProfile);
router.get('/write-eligibility', isLoggedIn, getWriteEligibility);

module.exports = router;
