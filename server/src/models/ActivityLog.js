const { defineTable } = require('../db/table');

// One row per change a staff member makes in the admin area
const ActivityLog = defineTable({
    table: 'activity_log',
    timestamps: { createdAt: true, updatedAt: false },
    fields: {
        actor: { type: 'ref', col: 'actor_id' },
        actorName: 'text',
        actorRole: 'text',
        action: { type: 'text', enum: ['create', 'update', 'delete', 'import', 'status'], required: true },
        resource: { type: 'text', required: true },   // e.g. "tour", "coupon"
        resourceId: 'text',
        label: 'text',                                 // what was changed, in words ("Bali Escape")
        detail: 'text',                                // e.g. "status → active"
    },
});

module.exports = ActivityLog;
