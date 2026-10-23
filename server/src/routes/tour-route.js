const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const can = require('../middlewares/can');
const activity = require('../middlewares/activity');
const optionalAuth = require('../middlewares/optional-auth');
const { PERMISSIONS } = require('../config/permissions');
const {
    getTours, getRecommendedTours, getTourById, getTourFacets,
    createTour, updateTour, deleteTour, bulkCreateTours, duplicateTour, bulkTourAction,
} = require('../controllers/TourController');
const { createReview, getTourReviews } = require('../controllers/ReviewController');

const router = express.Router();
const catalog = [isLoggedIn, can(PERMISSIONS.CATALOG)];

router.get('/', optionalAuth, getTours);
router.get('/recommended', getRecommendedTours);
router.get('/facets', getTourFacets);
router.get('/:id', optionalAuth, getTourById);

router.post('/bulk', ...catalog, activity('tour', (req, body) => ({ action: 'import', label: `${body?.data?.created ?? 0} tours imported` })), bulkCreateTours);
router.post('/bulk-action', ...catalog, activity('tour', (req, body) => ({ action: 'status', label: `${body?.data?.affected ?? 0} tours`, detail: req.body?.action })), bulkTourAction);
router.post('/', ...catalog, activity('tour'), createTour);
router.post('/:id/duplicate', ...catalog, activity('tour', () => ({ action: 'create', detail: 'duplicated' })), duplicateTour);
router.put('/:id', ...catalog, activity('tour', (req) => (req.body?.status ? { detail: `status: ${req.body.status}` } : {})), updateTour);
router.delete('/:id', ...catalog, activity('tour'), deleteTour);

// Reviews nested under tours
router.get('/:tourId/reviews', getTourReviews);
router.post('/:tourId/reviews', isLoggedIn, createReview);

module.exports = router;
