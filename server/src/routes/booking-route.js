const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const authorize = require('../middlewares/authorize');
const {
    createBooking, getUserBookings, getBookingById, cancelBooking
} = require('../controllers/BookingController');

const router = express.Router();

router.post('/', isLoggedIn, authorize('user', 'moderator', 'admin'), createBooking);
router.get('/', isLoggedIn, authorize('user', 'moderator', 'admin'), getUserBookings);
router.get('/:id', isLoggedIn, authorize('user', 'moderator', 'admin'), getBookingById);
router.patch('/:id/cancel', isLoggedIn, authorize('user', 'moderator', 'admin'), cancelBooking);

module.exports = router;
