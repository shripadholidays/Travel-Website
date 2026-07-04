const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    country: {
        type: String,
        required: true
    },
    continent: {
        type: String,
        enum: ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    coverImage: {
        type: String,
        required: true
    },
    images: [String],
    coordinates: {
        lat: { type: Number },
        lng: { type: Number }
    },
    tourCount: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, { timestamps: true });

destinationSchema.index({ name: 'text', country: 'text', description: 'text' });

module.exports = mongoose.model('Destination', destinationSchema);
