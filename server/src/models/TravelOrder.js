const { defineTable } = require('../db/table');

const TITLES = ['Mr', 'Ms', 'Mrs', 'Mx'];
const GENDERS = ['male', 'female', 'other'];

const TravelOrder = defineTable({
    table: 'travel_orders',
    fields: {
        user: { type: 'ref', required: true, col: 'user_id' },
        kind: { type: 'text', enum: ['flight', 'hotel'], required: true },
        linkedBooking: { type: 'ref', default: null, col: 'linked_booking_id' },
        provider: { type: 'text', enum: ['mock', 'duffel', 'tripjack', 'liteapi'], required: true },
        providerRef: 'text',
        offerId: { type: 'text', required: true },
        status: { type: 'text', enum: ['pending', 'confirmed', 'cancelled', 'failed'], default: 'pending' },
        // Snapshot of what was booked (public shape: marked-up price, no supplier amounts)
        offer: { type: 'json', required: true },
        // [{ title, firstName, lastName, dob, gender, passportNumber, passportExpiry, nationality }]
        travellers: { type: 'json', required: true },
        'contact.email': { type: 'text', required: true, lowercase: true, trim: true, label: 'Contact email' },
        'contact.phone': 'text',
        // { supplierAmount, markupPct, markupAmount, total, currency }
        pricing: { type: 'json', required: true },
        // What the traveller was charged: the total converted into the currency they chose
        charge: { type: 'json', default: null },          // { currency, total, rate }
        paymentId: { type: 'ref', col: 'payment_id' },
        failureReason: 'text',
    },
    beforeSave(doc) {
        if (Array.isArray(doc.travellers)) {
            doc.travellers = doc.travellers.map((t) => ({
                ...t,
                title: TITLES.includes(t?.title) ? t.title : 'Mr',
                firstName: String(t?.firstName || '').trim(),
                lastName: String(t?.lastName || '').trim(),
                ...(t?.gender && !GENDERS.includes(t.gender) ? { gender: undefined } : {}),
            }));
        }
        if (doc.pricing && doc.pricing.currency === undefined) doc.pricing.currency = 'USD';
    },
    validate(doc) {
        const errors = {};
        if (!Array.isArray(doc.travellers) || doc.travellers.length === 0 || doc.travellers.some((t) => !t.firstName || !t.lastName)) {
            errors.travellers = 'Every traveller needs a first and last name';
        }
        const p = doc.pricing || {};
        if (['supplierAmount', 'markupPct', 'markupAmount', 'total'].some((k) => typeof p[k] !== 'number')) errors.pricing = 'Pricing is incomplete';
        return errors;
    },
});

// Traveller-facing view: hides supplier cost, markup and internal fields.
TravelOrder.toPublic = (o) => ({
    _id: o._id,
    kind: o.kind,
    status: o.status,
    providerRef: o.providerRef,
    offer: o.offer,
    travellers: o.travellers,
    contact: o.contact,
    pricing: { total: o.charge?.total ?? o.pricing.total, currency: o.charge?.currency ?? o.pricing.currency },
    linkedBooking: o.linkedBooking,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
});

module.exports = TravelOrder;
