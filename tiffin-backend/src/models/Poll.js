const mongoose = require('mongoose');

const PollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  option_a: {
    type: String,
    required: true
  },
  option_b: {
    type: String,
    required: true
  },
  votes_a: {
    type: Number,
    default: 0
  },
  votes_b: {
    type: Number,
    default: 0
  },
  votedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Poll', PollSchema);
