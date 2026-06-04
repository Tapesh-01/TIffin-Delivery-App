const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity cannot be less than 1']
  },
  price: {
    type: Number,
    required: true
  }
});

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: false // Optional for standard tiffin orders
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  isTiffinOrder: {
    type: Boolean,
    default: false
  },
  items: [OrderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    default: 'pending' // Can be 'pending', 'cooking', 'packed', 'out_for_delivery', 'delivered', 'cancelled', etc.
  },
  paymentMethod: {
    type: String,
    enum: ['wallet', 'cod', 'upi'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'approved', 'failed'],
    default: 'pending'
  },
  utrCode: {
    type: String
  },
  addons: [String],
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  emptyTiffinCollected: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', OrderSchema);
