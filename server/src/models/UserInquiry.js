const mongoose = require('mongoose');
const userInquirySchema = new mongoose.Schema({
  // The full name of the user
  fullName: {
    type: String,
    required: true,
  },
  // The email address of the user
  email: {
    type: String,
    required: true,
    // Basic email validation using a regular expression
    match: [/.+@.+\..+/, 'Please enter a valid email address'],
  },
  // The phone number of the user (optional: plenty of people prefer email)
  phoneNumber: {
    type: String,
    trim: true,
  },
  // The user's preferred travel date (optional: dates are often flexible)
  preferredTravelDate: {
    type: Date,
  },
  // The number of travelers
  numberOfTravelers: {
    type: Number,
    default: 1,
    min: [1, 'Number of travelers must be at least 1'],
  },
  // What the inquiry is about, so general questions do not need trip details
  topic: {
    type: String,
    enum: ["trip", "booking", "question", "other"],
    default: "trip",
  },
  // The tour, destination or search the traveller was looking at
  context: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  // Where on the site the inquiry was sent from
  source: {
    type: String,
    enum: ["contact", "chat", "no-results", "tour", "destination"],
    default: "contact",
  },
  // An optional message from the user
  message: {
    type: String,
  },
  // Admin status tracking
  status: {
    type: String,
    enum: ['new', 'read', 'replied'],
    default: 'new',
  },
}, { timestamps: true });
const UserInquiry = mongoose.model('User_Inquiry', userInquirySchema);
module.exports = UserInquiry;