const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const {
    createBooking, getUserBookings, getBookingById, cancelBooking
} = require('../controllers/BookingController');

const router = express.Router();

router.post('/', isLoggedIn, createBooking);
router.get('/', isLoggedIn, getUserBookings);
router.get('/:id', isLoggedIn, getBookingById);
router.patch('/:id/cancel', isLoggedIn, cancelBooking);

module.exports = router;
