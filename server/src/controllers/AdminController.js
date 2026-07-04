const User = require('../models/User');
const Booking = require('../models/Booking');
const TravelDestination = require('../models/TravelDestination');
const Review = require('../models/Review');
const UserInquiry = require('../models/UserInquiry');
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const Payment = require('../models/Payment');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

// GET /admin/stats
exports.getDashboardStats = async (req, res) => {
    try {
        const [totalUsers, totalBookings, totalTours, totalReviews] = await Promise.all([
            User.countDocuments(),
            Booking.countDocuments(),
            TravelDestination.countDocuments(),
            Review.countDocuments()
        ]);

        const revenueResult = await Booking.aggregate([
            { $match: { status: { $in: ['confirmed', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;

        const recentBookings = await Booking.find()
            .populate('user', 'displayName email')
            .populate('tour', 'title')
            .sort({ createdAt: -1 })
            .limit(5);

        const bookingsByStatus = await Booking.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        return ResponseHandler.success(res, {
            totalUsers,
            totalBookings,
            totalTours,
            totalReviews,
            totalRevenue,
            recentBookings,
            bookingsByStatus
        }, 'Dashboard stats fetched successfully');
    } catch (err) {
        logger.error('Error fetching dashboard stats', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch stats');
    }
};

// GET /admin/users
exports.getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, role, search } = req.query;
        const query = {};
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { displayName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        const total = await User.countDocuments(query);

        return ResponseHandler.success(res, {
            users,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        }, 'Users fetched successfully');
    } catch (err) {
        logger.error('Error fetching users', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch users');
    }
};

// PATCH /admin/users/:id
exports.updateUser = async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, runValidators: true }
        );
        if (!user) return ResponseHandler.fail(res, 404, 'User not found');
        return ResponseHandler.success(res, { user }, 'User updated successfully');
    } catch (err) {
        logger.error('Error updating user', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update user');
    }
};

// DELETE /admin/users/:id
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return ResponseHandler.fail(res, 404, 'User not found');
        return ResponseHandler.success(res, null, 'User deleted successfully');
    } catch (err) {
        logger.error('Error deleting user', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete user');
    }
};

// GET /admin/inquiries
exports.getInquiries = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const query = status ? { status } : {};
        const inquiries = await UserInquiry.find(query)
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));
        const total = await UserInquiry.countDocuments(query);
        return ResponseHandler.success(res, {
            inquiries,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (err) {
        logger.error('Error fetching inquiries', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch inquiries');
    }
};

// PATCH /admin/inquiries/:id
exports.updateInquiryStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const inquiry = await UserInquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!inquiry) return ResponseHandler.fail(res, 404, 'Inquiry not found');
        return ResponseHandler.success(res, { inquiry }, 'Inquiry updated');
    } catch (err) {
        logger.error('Error updating inquiry', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update inquiry');
    }
};

// GET /admin/subscribers
exports.getSubscribers = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const subscribers = await NewsletterSubscriber.find()
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));
        const total = await NewsletterSubscriber.countDocuments();
        return ResponseHandler.success(res, {
            subscribers,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (err) {
        logger.error('Error fetching subscribers', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch subscribers');
    }
};

// DELETE /admin/subscribers/:id
exports.deleteSubscriber = async (req, res) => {
    try {
        const sub = await NewsletterSubscriber.findByIdAndDelete(req.params.id);
        if (!sub) return ResponseHandler.fail(res, 404, 'Subscriber not found');
        return ResponseHandler.success(res, null, 'Subscriber removed');
    } catch (err) {
        logger.error('Error deleting subscriber', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete subscriber');
    }
};

// GET /admin/reviews
exports.getAllReviews = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const reviews = await Review.find()
            .populate('user', 'displayName email profilePicture')
            .populate('tour', 'title')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));
        const total = await Review.countDocuments();
        return ResponseHandler.success(res, {
            reviews,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (err) {
        logger.error('Error fetching reviews', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch reviews');
    }
};

// DELETE /admin/reviews/:id
exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id);
        if (!review) return ResponseHandler.fail(res, 404, 'Review not found');
        return ResponseHandler.success(res, null, 'Review deleted');
    } catch (err) {
        logger.error('Error deleting review', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete review');
    }
};

// GET /admin/payments
exports.getPayments = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const payments = await Payment.find()
            .populate('user', 'displayName email')
            .populate('booking')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));
        const total = await Payment.countDocuments();
        return ResponseHandler.success(res, {
            payments,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (err) {
        logger.error('Error fetching payments', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch payments');
    }
};
