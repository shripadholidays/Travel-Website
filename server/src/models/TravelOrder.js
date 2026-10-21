const mongoose = require('mongoose');

const travellerSchema = new mongoose.Schema({
    title: { type: String, enum: ['Mr', 'Ms', 'Mrs', 'Mx'], default: 'Mr' },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dob: String,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    passportNumber: String,
    passportExpiry: String,
    nationality: String,
}, { _id: false });

const travelOrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['flight', 'hotel'], required: true },
    linkedBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    provider: { type: String, enum: ['mock', 'duffel', 'tripjack', 'liteapi'], required: true },
    providerRef: String,
    offerId: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'failed'],
        default: 'pending',
    },
    // Snapshot of what was booked (public shape: marked-up price, no supplier amounts)
    offer: { type: mongoose.Schema.Types.Mixed, required: true },
    travellers: { type: [travellerSchema], validate: (v) => Array.isArray(v) && v.length > 0 },
    contact: {
        email: { type: String, required: true, lowercase: true, trim: true },
        phone: String,
    },
    pricing: {
        supplierAmount: { type: Number, required: true },
        markupPct: { type: Number, required: true },
        markupAmount: { type: Number, required: true },
        total: { type: Number, required: true },
        currency: { type: String, default: 'USD' },
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    failureReason: String,
}, { timestamps: true });

travelOrderSchema.index({ user: 1, createdAt: -1 });
travelOrderSchema.index({ kind: 1, status: 1 });

// Traveller-facing view: hides supplier cost, markup and internal fields.
travelOrderSchema.methods.toPublic = function toPublic() {
    const o = this.toObject({ virtuals: false });
    return {
        _id: o._id,
        kind: o.kind,
        status: o.status,
        providerRef: o.providerRef,
        offer: o.offer,
        travellers: o.travellers,
        contact: o.contact,
        pricing: { total: o.pricing.total, currency: o.pricing.currency },
        linkedBooking: o.linkedBooking,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
    };
};

module.exports = mongoose.model('TravelOrder', travelOrderSchema);
