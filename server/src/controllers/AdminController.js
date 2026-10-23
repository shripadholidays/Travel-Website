const User = require('../models/User');
const Booking = require('../models/Booking');
const TravelDestination = require('../models/TravelDestination');
const TravelOrder = require('../models/TravelOrder');
const Review = require('../models/Review');
const BlogPost = require('../models/BlogPost');
const ActivityLog = require('../models/ActivityLog');
const { recomputeTourRating } = require('../services/rating-service');
const UserInquiry = require('../models/UserInquiry');
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const Payment = require('../models/Payment');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const config = require('../config');
const { ROLES, ROLE_NAMES, STAFF_ROLES, PERMISSIONS: P, hasPermission, permissionsFor } = require('../config/permissions');

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const searchRegex = (q) => (q && String(q).trim() ? new RegExp(escapeRegex(String(q).trim()), 'i') : null);

function paging(req, fallback = config.pagination.adminDefaultLimit) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || fallback));
    return { page, limit, skip: (page - 1) * limit };
}
const pageInfo = (total, { page, limit }) => ({ total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });

async function countBy(Model, field, match = {}) {
    const rows = await Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
}

// GET /admin/stats — every staff member sees the parts their role works on
exports.getDashboardStats = async (req, res) => {
    try {
        const can = (p) => hasPermission(req.user, p);
        const data = { attention: {} };

        const counts = await Promise.all([
            TravelDestination.countDocuments({ status: 'active' }),
            TravelDestination.countDocuments({ status: { $ne: 'active' } }),
            can(P.BOOKINGS) ? Booking.countDocuments() : null,
            can(P.BOOKINGS) ? Booking.countDocuments({ status: 'pending' }) : null,
            can(P.ARTICLES) ? BlogPost.countDocuments({ status: 'pending' }) : null,
            can(P.COMMUNITY) ? UserInquiry.countDocuments({ status: 'new' }) : null,
            can(P.COMMUNITY) ? Review.countDocuments() : null,
            can(P.USERS) || can(P.FINANCE) ? User.countDocuments() : null,
        ]);
        const [liveTours, draftTours, totalBookings, pendingBookings, pendingArticles, newInquiries, totalReviews, totalUsers] = counts;

        data.totalTours = liveTours;
        if (can(P.CATALOG)) data.attention.draftTours = draftTours;
        if (totalBookings !== null) {
            data.totalBookings = totalBookings;
            data.attention.pendingBookings = pendingBookings;
            data.bookingsByStatus = await Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
            data.recentBookings = await Booking.find()
                .populate('user', 'displayName email')
                .populate('tour', 'title')
                .sort({ createdAt: -1 })
                .limit(config.pagination.dashboardRecentLimit);
        }
        if (pendingArticles !== null) data.attention.pendingArticles = pendingArticles;
        if (newInquiries !== null) data.attention.newInquiries = newInquiries;
        if (totalReviews !== null) data.totalReviews = totalReviews;
        if (totalUsers !== null) data.totalUsers = totalUsers;
        if (can(P.FINANCE)) {
            const revenue = await Booking.aggregate([
                { $match: { status: { $in: ['confirmed', 'completed'] } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]);
            data.totalRevenue = revenue[0]?.total || 0;
        }
        if (can(P.CATALOG)) {
            // Live tours missing what travellers look for first
            const [noGallery, noItinerary, expiringSoon] = await Promise.all([
                TravelDestination.countDocuments({ status: 'active', $and: [{ $or: [{ images: { $size: 0 } }, { images: { $exists: false } }] }, { $or: [{ 'overview.gallery': { $size: 0 } }, { 'overview.gallery': { $exists: false } }] }] }),
                TravelDestination.countDocuments({ status: 'active', $or: [{ itinerary: { $size: 0 } }, { itinerary: { $exists: false } }] }),
                TravelDestination.countDocuments({ status: 'active', validity: { $lte: new Date(Date.now() + 30 * 864e5) } }),
            ]);
            data.catalogHealth = { noGallery, noItinerary, expiringSoon };
        }

        return ResponseHandler.success(res, data, 'Dashboard stats fetched successfully');
    } catch (err) {
        logger.error('Error fetching dashboard stats', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch stats');
    }
};

// GET /admin/roles — the roles staff can be given, with what each can do
exports.getRoles = (req, res) => ResponseHandler.success(res, {
    roles: ROLE_NAMES.map((id) => ({ id, label: ROLES[id].label, description: ROLES[id].description, permissions: permissionsFor(id) })),
});

// GET /admin/users?search=&role=staff|<role>&page=
exports.getUsers = async (req, res) => {
    try {
        const pg = paging(req);
        const query = {};
        const { role, search, suspended } = req.query;
        if (role === 'staff') query.role = { $in: STAFF_ROLES };
        else if (role && ROLE_NAMES.includes(role)) query.role = role;
        if (suspended === 'true') query.isSuspended = true;
        const re = searchRegex(search);
        if (re) query.$or = [{ displayName: re }, { email: re }];

        const [users, total, roleCounts] = await Promise.all([
            User.find(query).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
            User.countDocuments(query),
            countBy(User, 'role'),
        ]);
        // How much each person has booked, so nobody deletes a customer by mistake
        const ids = users.map((u) => u._id);
        const booked = await Booking.aggregate([{ $match: { user: { $in: ids } } }, { $group: { _id: '$user', count: { $sum: 1 } } }]);
        const bookedBy = new Map(booked.map((b) => [String(b._id), b.count]));

        return ResponseHandler.success(res, {
            users: users.map((u) => ({ ...u, roleLabel: ROLES[u.role]?.label ?? u.role, bookingCount: bookedBy.get(String(u._id)) || 0 })),
            roleCounts,
            pagination: pageInfo(total, pg),
        }, 'Users fetched successfully');
    } catch (err) {
        logger.error('Error fetching users', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch users');
    }
};

async function isLastAdmin(user) {
    if (user.role !== 'admin' || user.isSuspended) return false;
    return (await User.countDocuments({ role: 'admin', isSuspended: { $ne: true } })) <= 1;
}

// PATCH /admin/users/:id — { role?, isSuspended? }
exports.updateUser = async (req, res) => {
    try {
        const { role, isSuspended } = req.body || {};
        const user = await User.findById(req.params.id);
        if (!user) return ResponseHandler.fail(res, 404, 'User not found');

        const self = String(user._id) === String(req.user._id);
        if (role !== undefined && !ROLE_NAMES.includes(role)) return ResponseHandler.fail(res, 400, 'Unknown role.');
        if (self && role !== undefined && role !== user.role) return ResponseHandler.fail(res, 400, "You can't change your own role. Ask another administrator.");
        if (self && isSuspended) return ResponseHandler.fail(res, 400, "You can't suspend your own account.");
        if ((role !== undefined && role !== 'admin') || isSuspended) {
            if (await isLastAdmin(user)) return ResponseHandler.fail(res, 409, 'This is the only active administrator. Make someone else an administrator first.');
        }

        if (role !== undefined) user.role = role;
        if (isSuspended !== undefined) user.isSuspended = !!isSuspended;
        await user.save();

        const out = user.toObject();
        return ResponseHandler.success(res, { user: { ...out, roleLabel: ROLES[out.role]?.label } }, 'User updated successfully');
    } catch (err) {
        logger.error('Error updating user', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update user');
    }
};

// DELETE /admin/users/:id — only accounts with no trip history; others are suspended instead
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return ResponseHandler.fail(res, 404, 'User not found');
        if (String(user._id) === String(req.user._id)) return ResponseHandler.fail(res, 400, "You can't delete your own account here.");
        if (await isLastAdmin(user)) return ResponseHandler.fail(res, 409, 'This is the only active administrator and cannot be deleted.');

        const [bookings, orders] = await Promise.all([
            Booking.countDocuments({ user: user._id }),
            TravelOrder.countDocuments({ user: user._id }),
        ]);
        if (bookings + orders > 0) {
            return ResponseHandler.fail(res, 409, `${user.displayName} has ${bookings + orders} booking(s) on record, so the account can't be deleted. Suspend it instead.`);
        }
        await user.deleteOne();
        return ResponseHandler.success(res, { user: { _id: user._id, email: user.email } }, 'User deleted successfully');
    } catch (err) {
        logger.error('Error deleting user', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete user');
    }
};

// GET /admin/inquiries?status=&search=&page=
exports.getInquiries = async (req, res) => {
    try {
        const pg = paging(req);
        const query = {};
        const re = searchRegex(req.query.search);
        if (re) query.$or = [{ fullName: re }, { email: re }, { message: re }, { context: re }];
        const counts = await countBy(UserInquiry, 'status', query);
        if (req.query.status && req.query.status !== 'all') query.status = req.query.status;
        const [inquiries, total] = await Promise.all([
            UserInquiry.find(query).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
            UserInquiry.countDocuments(query),
        ]);
        return ResponseHandler.success(res, { inquiries, statusCounts: counts, pagination: pageInfo(total, pg) });
    } catch (err) {
        logger.error('Error fetching inquiries', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch inquiries');
    }
};

// PATCH /admin/inquiries/:id
exports.updateInquiryStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['new', 'read', 'replied'].includes(status)) return ResponseHandler.fail(res, 400, 'Invalid status');
        const inquiry = await UserInquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!inquiry) return ResponseHandler.fail(res, 404, 'Inquiry not found');
        return ResponseHandler.success(res, { inquiry: { _id: inquiry._id, name: inquiry.fullName, status: inquiry.status } }, 'Inquiry updated');
    } catch (err) {
        logger.error('Error updating inquiry', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update inquiry');
    }
};

// GET /admin/subscribers?search=&page=  (?all=true for the CSV export)
exports.getSubscribers = async (req, res) => {
    try {
        const pg = paging(req, config.pagination.subscribersLimit);
        const query = {};
        const re = searchRegex(req.query.search);
        if (re) query.email = re;
        const all = req.query.all === 'true';
        const [subscribers, total] = await Promise.all([
            all ? NewsletterSubscriber.find(query).sort({ createdAt: -1 })
                : NewsletterSubscriber.find(query).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
            NewsletterSubscriber.countDocuments(query),
        ]);
        return ResponseHandler.success(res, { subscribers, pagination: pageInfo(total, pg) });
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
        return ResponseHandler.success(res, { subscriber: { _id: sub._id, email: sub.email } }, 'Subscriber removed');
    } catch (err) {
        logger.error('Error deleting subscriber', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete subscriber');
    }
};

// GET /admin/reviews?search=&rating=&page=
exports.getAllReviews = async (req, res) => {
    try {
        const pg = paging(req);
        const query = {};
        const re = searchRegex(req.query.search);
        if (re) {
            const [users, tours] = await Promise.all([
                User.find({ $or: [{ displayName: re }, { email: re }] }, '_id').lean(),
                TravelDestination.find({ title: re }, '_id').lean(),
            ]);
            query.$or = [{ content: re }, { title: re }, { user: { $in: users.map((u) => u._id) } }, { tour: { $in: tours.map((t) => t._id) } }];
        }
        const rating = Number(req.query.rating);
        if (rating >= 1 && rating <= 5) query.rating = rating;
        const [reviews, total] = await Promise.all([
            Review.find(query)
                .populate('user', 'displayName email profilePicture')
                .populate('tour', 'title')
                .sort({ createdAt: -1 })
                .skip(pg.skip)
                .limit(pg.limit),
            Review.countDocuments(query),
        ]);
        return ResponseHandler.success(res, { reviews, pagination: pageInfo(total, pg) });
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
        await recomputeTourRating(review.tour);
        return ResponseHandler.success(res, { review: { _id: review._id, title: review.title || `${review.rating}-star review` } }, 'Review deleted');
    } catch (err) {
        logger.error('Error deleting review', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete review');
    }
};

// GET /admin/payments?status=&search=&page=
exports.getPayments = async (req, res) => {
    try {
        const pg = paging(req);
        const query = {};
        if (req.query.status && req.query.status !== 'all') query.status = req.query.status;
        const re = searchRegex(req.query.search);
        if (re) {
            const users = await User.find({ $or: [{ displayName: re }, { email: re }] }, '_id').lean();
            query.$or = [{ stripePaymentIntentId: re }, { user: { $in: users.map((u) => u._id) } }];
        }
        const [payments, total, totals] = await Promise.all([
            Payment.find(query)
                .populate('user', 'displayName email')
                .populate({ path: 'booking', select: 'tour status', populate: { path: 'tour', select: 'title' } })
                .populate('order', 'kind status providerRef')
                .sort({ createdAt: -1 })
                .skip(pg.skip)
                .limit(pg.limit),
            Payment.countDocuments(query),
            Payment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
        ]);
        const summary = Object.fromEntries(totals.map((t) => [t._id, { count: t.count, amount: Math.round(t.amount * 100) / 100 }]));
        return ResponseHandler.success(res, { payments, summary, pagination: pageInfo(total, pg) });
    } catch (err) {
        logger.error('Error fetching payments', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch payments');
    }
};

// GET /admin/activity?resource=&actor=&page=
exports.getActivity = async (req, res) => {
    try {
        const pg = paging(req, 30);
        const query = {};
        if (req.query.resource && req.query.resource !== 'all') query.resource = req.query.resource;
        if (req.query.actor) query.actor = req.query.actor;
        const [entries, total, resources] = await Promise.all([
            ActivityLog.find(query).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
            ActivityLog.countDocuments(query),
            ActivityLog.distinct('resource'),
        ]);
        return ResponseHandler.success(res, { entries, resources: resources.sort(), pagination: pageInfo(total, pg) });
    } catch (err) {
        logger.error('Error fetching activity', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch activity');
    }
};
