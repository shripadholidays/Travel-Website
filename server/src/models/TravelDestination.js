const mongoose = require('mongoose');

// Sub-schema for individual customer reviews
const reviewSchema = new mongoose.Schema({
    avatarURL: { type: String },   
    author: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true },
    reviewedOn: { type: Date, default: Date.now },
});

// Sub-schema for gallery images
const gallerySchema = new mongoose.Schema({
    imageURL: { type: String, required: true },
    altText: { type: String },
});

// Sub-schema for inclusions/exclusions
const inclusionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    included: { type: Boolean, required: true, default: true },
});

// Sub-schema for itinerary day
const itineraryDaySchema = new mongoose.Schema({
    day: { type: Number, required: true }, // Day number
    activity: { type: String, required: true },
    location: { type: String, required: true },
});

// Required only once a tour is live (works for documents and update queries)
function isLive() {
    const status = this instanceof mongoose.Query ? (this.getUpdate()?.status ?? this.getUpdate()?.$set?.status) : this.status;
    return (status ?? 'active') === 'active';
}

// Main schema for Travel Destination
const travelDestinationSchema = new mongoose.Schema({
    title: { type: String, required: [true, 'Title is required'], trim: true, index: true }, // Indexed for text search
    location: { type: String, required: [true, 'Location is required'], trim: true, index: true }, // Indexed for country filtering
    // Drafts may be saved half-finished; a live tour needs a price, a cover image and a description
    price: { type: Number, default: 0, required: [isLive, 'Price is required'], validate: { validator(v) { return !isLive.call(this) || v >= 1; }, message: 'Price must be at least $1' }, index: true }, // Indexed for range filtering
    // Prices are in US dollars: checkout charges tour.price in USD (see BookingController)
    currency: { type: String, required: true, default: 'USD' },
    duration: {
        days: { type: Number, required: true, index: true }, // Indexed for filtering
        nights: { type: Number, required: true, index: true },
    },
    validity: { type: Date, required: [true, 'The last available date is required'], index: true }, // Can filter by date range
    inclusions: [inclusionSchema],
    itinerary: [itineraryDaySchema],
    imageURL: { type: String, required: [isLive, 'A cover image is required'] },
    images: [String],
    categories: { type: [String], index: true }, // Indexed for theme filtering
    emi: { type: String },   // short card highlight, e.g. "Best seller" (never a price claim)
    overview: {
        about: { type: String, required: [isLive, 'The "About this tour" description is required'] },
        gallery: [gallerySchema],
    },
    reviews: {
        rating: { type: Number, default: 0, index: true },
        basedOn: { type: Number, default: 0 },
        individualReviews: [reviewSchema],
    },
    maxGroupSize: { type: Number, default: null, min: 1 },
    isFeatured: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'active', index: true },
    coordinates: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
    },
    // Who created and last changed the listing (shown in the tour editor)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Create text index for full-text search on title and overview
travelDestinationSchema.index({ title: 'text', 'overview.about': 'text' });

const TravelDestination = mongoose.model('Travel_Destination', travelDestinationSchema);
module.exports = TravelDestination;
