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

// Main schema for Travel Destination
const travelDestinationSchema = new mongoose.Schema({
    title: { type: String, required: true, index: true }, // Indexed for text search
    location: { type: String, required: true, index: true }, // Indexed for country filtering
    price: { type: Number, required: true, index: true }, // Indexed for range filtering
    currency: { type: String, required: true, default: '₹' },
    duration: {
        days: { type: Number, required: true, index: true }, // Indexed for filtering
        nights: { type: Number, required: true, index: true },
    },
    validity: { type: Date, required: true, index: true }, // Can filter by date range
    inclusions: [inclusionSchema],
    itinerary: [itineraryDaySchema],
    imageURL: { type: String, required: true },
    images: [String],
    categories: { type: [String], index: true }, // Indexed for theme filtering
    emi: { type: String },   // short card highlight, e.g. "Best seller" (never a price claim)
    overview: {
        about: { type: String, required: true },
        gallery: [gallerySchema],
    },
    reviews: {
        rating: { type: Number, default: 0, index: true },
        basedOn: { type: Number, default: 0 },
        individualReviews: [reviewSchema],
    },
    maxGroupSize: { type: Number, default: null },
    isFeatured: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'active', index: true },
    coordinates: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
    },
}, { timestamps: true });

// Create text index for full-text search on title and overview
travelDestinationSchema.index({ title: 'text', 'overview.about': 'text' });

const TravelDestination = mongoose.model('Travel_Destination', travelDestinationSchema);
module.exports = TravelDestination;
