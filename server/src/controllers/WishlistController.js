const { isId } = require('../db/ids');
const { populate } = require('../db/sql');
const Wishlist = require('../models/Wishlist');
const TravelDestination = require('../models/TravelDestination');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

const TOUR_FIELDS = 'title imageURL location price currency duration reviews.rating categories';
const mine = (req) => Wishlist.findOne('user_id = ?', [req.user._id]);

// GET /wishlist
exports.getWishlist = async (req, res) => {
    try {
        const wishlist = (await mine(req)) || { tours: [] };
        await populate(wishlist, 'tours', TravelDestination, TOUR_FIELDS);
        return ResponseHandler.success(res, { wishlist }, 'Wishlist fetched successfully');
    } catch (err) {
        logger.error('Error fetching wishlist', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch wishlist');
    }
};

// POST /wishlist/:tourId
exports.addToWishlist = async (req, res) => {
    try {
        const { tourId } = req.params;
        if (!isId(tourId) || !(await TravelDestination.findById(tourId))) return ResponseHandler.fail(res, 404, 'Tour not found');

        let wishlist = await mine(req);
        if (!wishlist) {
            wishlist = await Wishlist.insert({ user: req.user._id, tours: [tourId] });
        } else {
            if (wishlist.tours.includes(tourId)) {
                return ResponseHandler.fail(res, 400, 'Tour already in wishlist');
            }
            wishlist.tours.push(tourId);
            await Wishlist.save(wishlist);
        }

        await populate(wishlist, 'tours', TravelDestination, TOUR_FIELDS);
        return ResponseHandler.success(res, { wishlist }, 'Tour added to wishlist');
    } catch (err) {
        logger.error('Error adding to wishlist', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to add to wishlist');
    }
};

// DELETE /wishlist/:tourId
exports.removeFromWishlist = async (req, res) => {
    try {
        const wishlist = await mine(req);
        if (!wishlist) return ResponseHandler.fail(res, 404, 'Wishlist not found');

        wishlist.tours = wishlist.tours.filter((id) => id !== req.params.tourId);
        await Wishlist.save(wishlist);

        return ResponseHandler.success(res, { wishlist }, 'Tour removed from wishlist');
    } catch (err) {
        logger.error('Error removing from wishlist', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to remove from wishlist');
    }
};
