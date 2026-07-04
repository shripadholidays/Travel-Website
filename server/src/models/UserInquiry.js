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
  // The phone number of the user
  phoneNumber: {
    type: String,
    required: true,
  },
  // The user's preferred travel date
  preferredTravelDate: {
    type: Date,
    required: true,
  },
  // The number of travelers
  numberOfTravelers: {
    type: Number,
    required: true,
    min: [1, 'Number of travelers must be at least 1'],
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