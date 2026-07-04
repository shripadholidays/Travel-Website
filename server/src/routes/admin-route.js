const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const authorize = require('../middlewares/authorize');
const {
    getDashboardStats,
    getUsers, updateUser, deleteUser,
    getInquiries, updateInquiryStatus,
    getSubscribers, deleteSubscriber,
    getAllReviews, deleteReview,
    getPayments,
} = require('../controllers/AdminController');
const { getAllBookings, updateBookingStatus } = require('../controllers/BookingController');
const { getSettings, updateSettings, toggleSection } = require('../controllers/SettingsController');
const { getAllCollections, createCollection, updateCollection, deleteCollection } = require('../controllers/CollectionController');

const router = express.Router();

router.use(isLoggedIn, authorize('admin'));

// Dashboard
router.get('/stats', getDashboardStats);

// Users
router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Bookings
router.get('/bookings', getAllBookings);
router.patch('/bookings/:id', updateBookingStatus);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.patch('/settings/sections/:sectionId', toggleSection);

// Inquiries
router.get('/inquiries', getInquiries);
router.patch('/inquiries/:id', updateInquiryStatus);

// Newsletter subscribers
router.get('/subscribers', getSubscribers);
router.delete('/subscribers/:id', deleteSubscriber);

// Reviews moderation
router.get('/reviews', getAllReviews);
router.delete('/reviews/:id', deleteReview);

// Payments
router.get('/payments', getPayments);

// Collections (admin CRUD)
router.get('/collections', getAllCollections);
router.post('/collections', createCollection);
router.put('/collections/:id', updateCollection);
router.delete('/collections/:id', deleteCollection);

module.exports = router;
