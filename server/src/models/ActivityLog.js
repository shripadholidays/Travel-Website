const mongoose = require('mongoose');

// One row per change a staff member makes in the admin area
const activityLogSchema = new mongoose.Schema({
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    actorName: { type: String },
    actorRole: { type: String },
    action: { type: String, enum: ['create', 'update', 'delete', 'import', 'status'], required: true },
    resource: { type: String, required: true, index: true },   // e.g. "tour", "coupon"
    resourceId: { type: String },
    label: { type: String },                                    // what was changed, in words ("Bali Escape")
    detail: { type: String },                                   // e.g. "status → active"
}, { timestamps: { createdAt: true, updatedAt: false } });

activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
