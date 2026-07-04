const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const authorize = require('../middlewares/authorize');
const {
    getTours, getRecommendedTours, getTourById,
    createTour, updateTour, deleteTour, bulkCreateTours
} = require('../controllers/TourController');
const { createReview, getTourReviews } = require('../controllers/ReviewController');

const router = express.Router();

router.get('/', getTours);
router.get('/recommended', getRecommendedTours);
router.get('/:id', getTourById);

router.post('/bulk', isLoggedIn, authorize('admin'), bulkCreateTours);
router.post('/', isLoggedIn, authorize('admin'), createTour);
router.put('/:id', isLoggedIn, authorize('admin'), updateTour);
router.delete('/:id', isLoggedIn, authorize('admin'), deleteTour);

// Reviews nested under tours
router.get('/:tourId/reviews', getTourReviews);
router.post('/:tourId/reviews', isLoggedIn, authorize('user', 'moderator', 'admin'), createReview);

module.exports = router;
