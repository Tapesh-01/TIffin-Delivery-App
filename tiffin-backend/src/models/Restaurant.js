const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String
  },
  isVeg: {
    type: Boolean,
    default: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    default: 'Popular Dishes'
  },
  originalPrice: {
    type: Number
  }
});

const RestaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a restaurant name'],
    unique: true
  },
  cuisine: {
    type: String,
    required: [true, 'Please add a cuisine type']
  },
  rating: {
    type: Number,
    default: 4.5
  },
  ratingCount: {
    type: Number,
    default: 120
  },
  deliveryTime: {
    type: String,
    default: '25-35 mins'
  },
  image: {
    type: String
  },
  menuItems: [MenuItemSchema],
  latitude: {
    type: Number,
    default: 28.6139
  },
  longitude: {
    type: Number,
    default: 77.2090
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);
