const mongoose = require('mongoose');

const MealRatingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: { type: String, default: 'Student' },
  date: {
    type: String, // e.g. "2026-05-29"
    required: true
  },
  dayName: { type: String }, // e.g. "Thursday"
  mealName: { type: String, default: 'Today\'s Meal' },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// One rating per user per day
MealRatingSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('MealRating', MealRatingSchema);
