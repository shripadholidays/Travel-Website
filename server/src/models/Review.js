const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    tour: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Travel_Destination',
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        maxlength: 200
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000
    },
    isVerifiedBooking: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

reviewSchema.index({ tour: 1, createdAt: -1 });
reviewSchema.index({ user: 1, tour: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
