// Staff roles and what each one may do in the admin area.
// The client mirrors this list (client/src/lib/admin-access.ts) for menus and page guards;
// the server is the one that enforces it.

const PERMISSIONS = {
    DASHBOARD: 'dashboard.view',
    CATALOG: 'catalog.manage',       // tours, destinations, collections, image uploads
    CONTENT: 'content.manage',       // homepage, about page, FAQ
    BOOKINGS: 'bookings.manage',     // tour bookings and flight/hotel orders
    FINANCE: 'finance.view',         // payments and revenue figures
    MARKETING: 'marketing.manage',   // coupons and newsletter subscribers
    COMMUNITY: 'community.manage',   // reviews and inquiries
    ARTICLES: 'articles.review',     // publish or send back traveller articles
    USERS: 'users.manage',           // accounts and staff roles
    SETTINGS: 'settings.manage',     // company details, footer, booking services
    ACTIVITY: 'activity.view',       // the staff activity log
};

const ALL = Object.values(PERMISSIONS);
const P = PERMISSIONS;

const ROLES = {
    user: {
        label: 'Traveller',
        description: 'Books trips, writes reviews and articles. No admin access.',
        permissions: [],
    },
    moderator: {
        label: 'Article moderator',
        description: 'Reviews, publishes and sends back traveller articles.',
        permissions: [P.ARTICLES],
    },
    support: {
        label: 'Customer support',
        description: 'Handles bookings, flight and hotel orders, messages and reviews.',
        permissions: [P.DASHBOARD, P.BOOKINGS, P.COMMUNITY],
    },
    editor: {
        label: 'Catalog editor',
        description: 'Lists and edits tours, destinations and collections, and the site content.',
        permissions: [P.DASHBOARD, P.CATALOG, P.CONTENT, P.ARTICLES],
    },
    manager: {
        label: 'Manager',
        description: 'Runs the whole catalog and operations. Cannot change staff roles or site settings.',
        permissions: ALL.filter((p) => p !== P.USERS && p !== P.SETTINGS),
    },
    admin: {
        label: 'Administrator',
        description: 'Full access, including staff roles and site settings.',
        permissions: ALL,
    },
};

const ROLE_NAMES = Object.keys(ROLES);
const STAFF_ROLES = ROLE_NAMES.filter((r) => r !== 'user');

const permissionsFor = (role) => ROLES[role]?.permissions ?? [];
const hasPermission = (user, permission) => !!user && permissionsFor(user.role).includes(permission);
const isStaff = (user) => !!user && STAFF_ROLES.includes(user.role);

module.exports = { PERMISSIONS, ROLES, ROLE_NAMES, STAFF_ROLES, permissionsFor, hasPermission, isStaff };
