const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const can = require('../middlewares/can');
const activity = require('../middlewares/activity');
const { PERMISSIONS: P, STAFF_ROLES } = require('../config/permissions');
const ResponseHandler = require('../utils/response-handler');
const {
    getDashboardStats, getRoles,
    getUsers, updateUser, deleteUser,
    getInquiries, updateInquiryStatus,
    getSubscribers, deleteSubscriber,
    getAllReviews, deleteReview,
    getPayments, getActivity,
} = require('../controllers/AdminController');
const { getAllBookings, updateBookingStatus } = require('../controllers/BookingController');
const { getSettings, updateSettings, toggleSection, refreshRates } = require('../controllers/SettingsController');
const { getAllCollections, createCollection, updateCollection, deleteCollection } = require('../controllers/CollectionController');
const { listCoupons, createCoupon, updateCoupon, deleteCoupon } = require('../controllers/CouponController');
const { adminList: listTravelOrders, adminUpdate: updateTravelOrder } = require('../controllers/TravelOrderController');

const router = express.Router();

// Every admin route needs a staff account; each one then checks its own permission
router.use(isLoggedIn, (req, res, next) => (
    STAFF_ROLES.includes(req.user.role) ? next() : ResponseHandler.fail(res, 403, 'Forbidden: staff only')
));

// Dashboard (what it shows depends on the role)
router.get('/stats', can(P.DASHBOARD, P.ARTICLES), getDashboardStats);
router.get('/roles', getRoles);

// Users and staff roles
router.get('/users', can(P.USERS), getUsers);
router.patch('/users/:id', can(P.USERS), activity('user', (req) => ({
    action: req.body?.role ? 'update' : 'status',
    detail: [req.body?.role && `role: ${req.body.role}`, req.body?.isSuspended !== undefined && (req.body.isSuspended ? 'suspended' : 'reactivated')].filter(Boolean).join(', '),
})), updateUser);
router.delete('/users/:id', can(P.USERS), activity('user'), deleteUser);

// Bookings
router.get('/bookings', can(P.BOOKINGS), getAllBookings);
router.patch('/bookings/:id', can(P.BOOKINGS), activity('booking', (req) => ({ action: 'status', detail: `status: ${req.body?.status}` })), updateBookingStatus);

// Travel orders (flights & hotels) — always visible to staff, whatever the switches say
router.get('/travel-orders', can(P.BOOKINGS), listTravelOrders);
router.patch('/travel-orders/:id', can(P.BOOKINGS), activity('travel order', (req) => ({ action: 'status', detail: `status: ${req.body?.status}` })), updateTravelOrder);

// Settings: content editors manage page content; admins manage company details and services
router.get('/settings', can(P.SETTINGS, P.CONTENT, P.MARKETING), getSettings);
router.put('/settings', can(P.SETTINGS, P.CONTENT), activity('site settings', (req) => ({ label: Object.keys(req.body || {}).join(', ') })), updateSettings);
router.post('/settings/currency/refresh', can(P.SETTINGS), activity('exchange rates', () => ({ action: 'update', label: 'latest market rates' })), refreshRates);
router.patch('/settings/sections/:sectionId', can(P.CONTENT), activity('homepage section', (req) => ({ label: req.params.sectionId, detail: req.body?.isVisible ? 'shown' : 'hidden' })), toggleSection);

// Inquiries
router.get('/inquiries', can(P.COMMUNITY), getInquiries);
router.patch('/inquiries/:id', can(P.COMMUNITY), updateInquiryStatus);

// Newsletter subscribers
router.get('/subscribers', can(P.MARKETING), getSubscribers);
router.delete('/subscribers/:id', can(P.MARKETING), activity('subscriber'), deleteSubscriber);

// Reviews moderation
router.get('/reviews', can(P.COMMUNITY), getAllReviews);
router.delete('/reviews/:id', can(P.COMMUNITY), activity('review'), deleteReview);

// Payments
router.get('/payments', can(P.FINANCE), getPayments);

// Collections (admin list includes hidden ones)
router.get('/collections', can(P.CATALOG), getAllCollections);
router.post('/collections', can(P.CATALOG), activity('collection'), createCollection);
router.put('/collections/:id', can(P.CATALOG), activity('collection'), updateCollection);
router.delete('/collections/:id', can(P.CATALOG), activity('collection'), deleteCollection);

// Coupons
router.get('/coupons', can(P.MARKETING), listCoupons);
router.post('/coupons', can(P.MARKETING), activity('coupon'), createCoupon);
router.put('/coupons/:id', can(P.MARKETING), activity('coupon'), updateCoupon);
router.delete('/coupons/:id', can(P.MARKETING), activity('coupon'), deleteCoupon);

// Staff activity log
router.get('/activity', can(P.ACTIVITY), getActivity);

module.exports = router;
