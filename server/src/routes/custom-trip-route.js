const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const optionalAuth = require('../middlewares/optional-auth');
const { strictLimiter } = require('../middlewares/rate-limit');
const { createTrip, myTrips } = require('../controllers/CustomTripController');

const router = express.Router();

// Guests can send a trip too; signed-in travellers also see it in their dashboard
router.post('/', strictLimiter, optionalAuth, createTrip);
router.get('/mine', isLoggedIn, myTrips);

module.exports = router;
