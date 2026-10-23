const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

const ACTION_BY_METHOD = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };

// The first named thing in a response or request body, so the log reads "Bali Escape" not an id
function describe(...sources) {
    for (const src of sources) {
        if (!src || typeof src !== 'object') continue;
        for (const value of Object.values(src)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                const name = value.title || value.name || value.code || value.email || value.displayName;
                if (name) return { label: String(name), id: value._id ? String(value._id) : undefined };
            }
        }
        const name = src.title || src.name || src.code || src.email || src.displayName;
        if (name) return { label: String(name), id: src._id ? String(src._id) : undefined };
    }
    return {};
}

/**
 * Records every successful change made through the router it is mounted on.
 * `resolve(req)` may name the resource ("tour") and override the action or detail.
 */
module.exports = function activity(resource, resolve) {
    return (req, res, next) => {
        const action = ACTION_BY_METHOD[req.method];
        if (!action) return next();

        let body;
        const json = res.json.bind(res);
        res.json = (payload) => {
            body = payload;
            return json(payload);
        };

        res.on('finish', () => {
            if (res.statusCode >= 400 || !req.user) return;
            const extra = (resolve && resolve(req, body)) || {};
            const named = describe(body?.data, req.body);
            ActivityLog.create({
                actor: req.user._id,
                actorName: req.user.displayName,
                actorRole: req.user.role,
                action: extra.action || action,
                resource: extra.resource || resource,
                resourceId: extra.resourceId || req.params?.id || named.id,
                label: extra.label || named.label,
                detail: extra.detail,
            }).catch((err) => logger.error('Failed to record activity', { error: err.message }));
        });
        next();
    };
};
