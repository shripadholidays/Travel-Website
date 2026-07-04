const Wishlist = require('../models/Wishlist');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

// GET /wishlist
exports.getWishlist = async (req, res) => {
    try {
        let wishlist = await Wishlist.findOne({ user: req.user._id })
            .populate('tours', 'title imageURL location price duration reviews.rating categories');

        if (!wishlist) {
            wishlist = { tours: [] };
        }

        return ResponseHandler.success(res, { wishlist }, 'Wishlist fetched successfully');
    } catch (err) {
        logger.error('Error fetching wishlist', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch wishlist');
    }
};

// POST /wishlist/:tourId
exports.addToWishlist = async (req, res) => {
    try {
        let wishlist = await Wishlist.findOne({ user: req.user._id });

        if (!wishlist) {
            wishlist = await Wishlist.create({ user: req.user._id, tours: [req.params.tourId] });
        } else {
            if (wishlist.tours.includes(req.params.tourId)) {
                return ResponseHandler.fail(res, 400, 'Tour already in wishlist');
            }
            wishlist.tours.push(req.params.tourId);
            await wishlist.save();
        }

        const populatedWishlist = await Wishlist.findById(wishlist._id)
            .populate('tours', 'title imageURL location price duration reviews.rating');

        return ResponseHandler.success(res, { wishlist: populatedWishlist }, 'Tour added to wishlist');
    } catch (err) {
        logger.error('Error adding to wishlist', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to add to wishlist');
    }
};

// DELETE /wishlist/:tourId
exports.removeFromWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ user: req.user._id });
        if (!wishlist) return ResponseHandler.fail(res, 404, 'Wishlist not found');

        wishlist.tours = wishlist.tours.filter(id => id.toString() !== req.params.tourId);
        await wishlist.save();

        return ResponseHandler.success(res, { wishlist }, 'Tour removed from wishlist');
    } catch (err) {
        logger.error('Error removing from wishlist', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to remove from wishlist');
    }
};
