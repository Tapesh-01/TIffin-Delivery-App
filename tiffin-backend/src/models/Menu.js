const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema({
  dayName: {
    type: String,
    required: true,
    unique: true
  },
  dayIndex: {
    type: Number,
    required: true,
    min: 1,
    max: 7
  },
  mainDish: {
    type: String,
    required: true
  },
  sideDish: {
    type: String,
    required: true
  },
  emoji: {
    type: String,
    default: '🍲'
  },
  calories: {
    type: String,
    default: '~500 kcal'
  },
  isVeg: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('Menu', MenuSchema);
