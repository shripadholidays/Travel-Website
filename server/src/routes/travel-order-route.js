const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const authorize = require('../middlewares/authorize');
const { requireFeature, requireAnyFeature } = require('../middlewares/require-feature');
const {
    createOrder, confirmOrder, getMyOrders, cancelOrder,
} = require('../controllers/TravelOrderController');

const router = express.Router();

router.use(isLoggedIn, authorize('user', 'moderator', 'admin'));

router.post('/', requireFeature((req) => req.body?.kind), createOrder);
router.get('/', requireAnyFeature(), getMyOrders);
// Order-specific routes check the order's own service inside the controller.
router.post('/:id/confirm', confirmOrder);
router.patch('/:id/cancel', cancelOrder);

module.exports = router;
