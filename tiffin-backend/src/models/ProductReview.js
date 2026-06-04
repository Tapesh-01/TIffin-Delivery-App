const mongoose = require('mongoose');

const ProductReviewSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  itemId: {
    type: String,
    required: true
  },
  itemName: {
    type: String
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    default: 'Student'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index: one review per user per product
ProductReviewSchema.index({ user: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('ProductReview', ProductReviewSchema);
