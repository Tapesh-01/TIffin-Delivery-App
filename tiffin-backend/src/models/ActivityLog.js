const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  activityType: {
    type: String,
    required: true,
    enum: [
      'signup',
      'login',
      'profile_update',
      'referral_applied',
      'wallet_recharge_request',
      'wallet_recharge_approved',
      'wallet_recharge_rejected',
      'plan_subscribed',
      'plan_cancelled',
      'order_placed',
      'order_dispatched',
      'order_delivered',
      'vacation_started',
      'vacation_cancelled',
      'meal_rated',
      'poll_voted',
      'admin_adjustment'
    ]
  },
  description: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
