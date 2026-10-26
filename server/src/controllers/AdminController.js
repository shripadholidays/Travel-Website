const { all } = require('../db');
const { isId } = require('../db/ids');
const { Where, containsAny, populate, paging: pageFrom } = require('../db/sql');
const User = require('../models/User');
const Booking = require('../models/Booking');
const TravelDestination = require('../models/TravelDestination');
const TravelOrder = require('../models/TravelOrder');
const Review = require('../models/Review');
const BlogPost = require('../models/BlogPost');
const ActivityLog = require('../models/ActivityLog');
const { recomputeTourRating } = require('../services/rating-service');
const UserInquiry = require('../models/UserInquiry');
const CustomTrip = require('../models/CustomTrip');
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const Payment = require('../models/Payment');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const config = require('../config');
const { getCurrencyConfig, convert, round2 } = require('../services/currency');
const { ROLES, ROLE_NAMES, STAFF_ROLES, PERMISSIONS: P, hasPermission, permissionsFor } = require('../config/permissions');

const paging = (req, fallback = config.pagination.adminDefaultLimit) => pageFrom(req.query, fallback);
const pageInfo = (total, { page, limit }) => ({ total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
const searchText = (q) => (q && String(q).trim() ? String(q).trim() : null);
const marks = (list) => list.map(() => '?').join(',');

// GET /admin/stats — every staff member sees the parts their role works on
exports.getDashboardStats = async (req, res) => {
    try {
        const can = (p) => hasPermission(req.user, p);
        const data = { attention: {} };

        const counts = await Promise.all([
            TravelDestination.count("status = 'active'"),
            TravelDestination.count("status <> 'active'"),
            can(P.BOOKINGS) ? Booking.count() : null,
            can(P.BOOKINGS) ? Booking.count("status = 'pending'") : null,
            can(P.ARTICLES) ? BlogPost.count("status = 'pending'") : null,
            can(P.COMMUNITY) ? UserInquiry.count("status = 'new'") : null,
            can(P.COMMUNITY) ? Review.count() : null,
            can(P.USERS) || can(P.FINANCE) ? User.count() : null,
        ]);
        const [liveTours, draftTours, totalBookings, pendingBookings, pendingArticles, newInquiries, totalReviews, totalUsers] = counts;

        data.totalTours = liveTours;
        if (can(P.CATALOG)) data.attention.draftTours = draftTours;
        if (totalBookings !== null) {
            data.totalBookings = totalBookings;
            data.attention.pendingBookings = pendingBookings;
            data.bookingsByStatus = Object.entries(await Booking.countBy('status')).map(([_id, count]) => ({ _id, count }));
            data.recentBookings = await Booking.find({ order: 'created_at DESC', limit: config.pagination.dashboardRecentLimit });
            await populate(data.recentBookings, 'user', User, 'displayName email');
            await populate(data.recentBookings, 'tour', TravelDestination, 'title');
        }
        if (pendingArticles !== null) data.attention.pendingArticles = pendingArticles;
        if (newInquiries !== null) data.attention.newInquiries = newInquiries;
        if (can(P.BOOKINGS)) data.attention.newCustomTrips = await CustomTrip.count("status = 'new'");
        if (totalReviews !== null) data.totalReviews = totalReviews;
        if (totalUsers !== null) data.totalUsers = totalUsers;
        if (can(P.FINANCE)) {
            // Bookings are charged in many currencies: add them up in the base currency.
            // Each booking keeps its base amount from the day it was made; older ones are converted now.
            const { base, rates } = await getCurrencyConfig();
            const rows = await all(`SELECT currency, base_currency, SUM(total_amount) AS total, SUM(base_amount) AS base_total
                                    FROM bookings WHERE status IN ('confirmed', 'completed') GROUP BY currency, base_currency`);
            data.totalRevenue = round2(rows.reduce((sum, r) => sum + (r.base_currency === base && r.base_total
                ? r.base_total
                : convert(r.total, r.currency || 'USD', base, rates)), 0));
            data.revenueCurrency = base;
        }
        if (can(P.CATALOG)) {
            // Live tours missing what travellers look for first
            const emptyList = (c) => `coalesce(json_array_length(${c}), 0) = 0`;
            const [noGallery, noItinerary, expiringSoon] = await Promise.all([
                TravelDestination.count(`status = 'active' AND ${emptyList('images')} AND ${emptyList('overview_gallery')}`),
                TravelDestination.count(`status = 'active' AND ${emptyList('itinerary')}`),
                TravelDestination.count("status = 'active' AND validity <= ?", [new Date(Date.now() + 30 * 864e5).toISOString()]),
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
        const where = new Where();
        const { role, search, suspended } = req.query;
        if (role === 'staff') where.in('role', STAFF_ROLES);
        else if (role && ROLE_NAMES.includes(role)) where.add('role = ?', role);
        if (suspended === 'true') where.add('is_suspended = 1');
        const q = searchText(search);
        if (q) { const m = containsAny(['display_name', 'email'], q); where.add(m.sql, ...m.args); }

        const [users, total, roleCounts] = await Promise.all([
            User.find({ where: where.sql, args: where.args, order: 'created_at DESC', limit: pg.limit, offset: pg.offset }),
            User.count(where.sql, where.args),
            User.countBy('role'),
        ]);
        // How much each person has booked, so nobody deletes a customer by mistake
        const ids = users.map((u) => u._id);
        const booked = ids.length ? await all(`SELECT user_id, COUNT(*) AS n FROM bookings WHERE user_id IN (${marks(ids)}) GROUP BY user_id`, ids) : [];
        const bookedBy = new Map(booked.map((b) => [b.user_id, Number(b.n)]));

        return ResponseHandler.success(res, {
            users: users.map((u) => ({ ...u, roleLabel: ROLES[u.role]?.label ?? u.role, bookingCount: bookedBy.get(u._id) || 0 })),
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
    return (await User.count("role = 'admin' AND coalesce(is_suspended, 0) = 0")) <= 1;
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
        await User.save(user);

        return ResponseHandler.success(res, { user: { ...user, roleLabel: ROLES[user.role]?.label } }, 'User updated successfully');
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
            Booking.count('user_id = ?', [user._id]),
            TravelOrder.count('user_id = ?', [user._id]),
        ]);
        if (bookings + orders > 0) {
            return ResponseHandler.fail(res, 409, `${user.displayName} has ${bookings + orders} booking(s) on record, so the account can't be deleted. Suspend it instead.`);
        }
        await User.remove(user._id);
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
        const where = new Where();
        const q = searchText(req.query.search);
        if (q) { const m = containsAny(['full_name', 'email', 'message', 'context'], q); where.add(m.sql, ...m.args); }
        const counts = await UserInquiry.countBy('status', where.sql, where.args);
        if (req.query.status && req.query.status !== 'all') where.add('status = ?', req.query.status);
        const [inquiries, total] = await Promise.all([
            UserInquiry.find({ where: where.sql, args: where.args, order: 'created_at DESC', limit: pg.limit, offset: pg.offset }),
            UserInquiry.count(where.sql, where.args),
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
        const inquiry = await UserInquiry.update(req.params.id, { status });
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
        const where = new Where();
        const q = searchText(req.query.search);
        if (q) { const m = containsAny(['email'], q); where.add(m.sql, ...m.args); }
        const all = req.query.all === 'true';
        const [subscribers, total] = await Promise.all([
            NewsletterSubscriber.find({ where: where.sql, args: where.args, order: 'created_at DESC', ...(all ? {} : { limit: pg.limit, offset: pg.offset }) }),
            NewsletterSubscriber.count(where.sql, where.args),
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
        const sub = await NewsletterSubscriber.remove(req.params.id);
        if (!sub) return ResponseHandler.fail(res, 404, 'Subscriber not found');
        return ResponseHandler.success(res, { subscriber: { _id: sub._id, email: sub.email } }, 'Subscriber removed');
    } catch (err) {
        logger.error('Error deleting subscriber', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete subscriber');
    }
};

// Ids of users whose name or email contains the text
async function usersMatching(q) {
    const m = containsAny(['display_name', 'email'], q);
    return (await all(`SELECT id FROM users WHERE ${m.sql}`, m.args)).map((r) => r.id);
}

// GET /admin/reviews?search=&rating=&page=
exports.getAllReviews = async (req, res) => {
    try {
        const pg = paging(req);
        const where = new Where();
        const q = searchText(req.query.search);
        if (q) {
            const text = containsAny(['content', 'title'], q);
            const users = containsAny(['u.display_name', 'u.email'], q);
            const tours = containsAny(['t.title'], q);
            where.add(`${text.sql} OR user_id IN (SELECT u.id FROM users u WHERE ${users.sql}) OR tour_id IN (SELECT t.id FROM tours t WHERE ${tours.sql})`,
                ...text.args, ...users.args, ...tours.args);
        }
        const rating = Number(req.query.rating);
        if (rating >= 1 && rating <= 5) where.add('rating = ?', rating);
        const [reviews, total] = await Promise.all([
            Review.find({ where: where.sql, args: where.args, order: 'created_at DESC', limit: pg.limit, offset: pg.offset }),
            Review.count(where.sql, where.args),
        ]);
        await populate(reviews, 'user', User, 'displayName email profilePicture');
        await populate(reviews, 'tour', TravelDestination, 'title');
        return ResponseHandler.success(res, { reviews, pagination: pageInfo(total, pg) });
    } catch (err) {
        logger.error('Error fetching reviews', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch reviews');
    }
};

// DELETE /admin/reviews/:id
exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.remove(req.params.id);
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
        const where = new Where();
        if (req.query.status && req.query.status !== 'all') where.add('status = ?', req.query.status);
        const q = searchText(req.query.search);
        if (q) {
            const intent = containsAny(['gateway_order_id', 'gateway_payment_id'], q);
            const ids = await usersMatching(q);
            where.add(ids.length ? `${intent.sql} OR user_id IN (${marks(ids)})` : intent.sql, ...intent.args, ...ids);
        }
        const [payments, total, totals] = await Promise.all([
            Payment.find({ where: where.sql, args: where.args, order: 'created_at DESC', limit: pg.limit, offset: pg.offset }),
            Payment.count(where.sql, where.args),
            all('SELECT status, currency, COUNT(*) AS n, SUM(amount) AS amount FROM payments GROUP BY status, currency'),
        ]);
        await populate(payments, 'user', User, 'displayName email');
        await populate(payments, 'booking', Booking, 'tour status');
        await populate(payments.map((p) => p.booking).filter(Boolean), 'tour', TravelDestination, 'title');
        await populate(payments, 'order', TravelOrder, 'kind status providerRef');
        for (const p of payments) delete p.gatewayResponse;

        // Totals per status in the base currency (payments are taken in several currencies)
        const { base, rates } = await getCurrencyConfig();
        const summary = {};
        for (const t of totals) {
            const row = summary[t.status] || (summary[t.status] = { count: 0, amount: 0 });
            row.count += Number(t.n);
            row.amount = round2(row.amount + convert(t.amount || 0, (t.currency || 'USD').toUpperCase(), base, rates));
        }
        return ResponseHandler.success(res, { payments, summary, summaryCurrency: base, pagination: pageInfo(total, pg) });
    } catch (err) {
        logger.error('Error fetching payments', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch payments');
    }
};

// GET /admin/activity?resource=&actor=&page=
exports.getActivity = async (req, res) => {
    try {
        const pg = paging(req, 30);
        const where = new Where();
        if (req.query.resource && req.query.resource !== 'all') where.add('resource = ?', req.query.resource);
        if (req.query.actor && isId(String(req.query.actor))) where.add('actor_id = ?', String(req.query.actor));
        const [entries, total, resources] = await Promise.all([
            ActivityLog.find({ where: where.sql, args: where.args, order: 'created_at DESC', limit: pg.limit, offset: pg.offset }),
            ActivityLog.count(where.sql, where.args),
            all('SELECT DISTINCT resource FROM activity_log ORDER BY resource'),
        ]);
        return ResponseHandler.success(res, { entries, resources: resources.map((r) => r.resource), pagination: pageInfo(total, pg) });
    } catch (err) {
        logger.error('Error fetching activity', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch activity');
    }
};

