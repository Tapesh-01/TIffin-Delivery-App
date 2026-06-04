const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    unique: true,
    sparse: true
  },
  addressLine: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  pincode: {
    type: String,
    default: ''
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  riderPin: {
    type: String
  },
  vehicle: {
    type: String,
    default: ''
  },
  isOnline: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'rider'],
    default: 'student'
  },
  plan: {
    type: String,
    enum: ['none', 'basic', 'standard', 'premium'],
    default: 'none'
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  isOnVacation: {
    type: Boolean,
    default: false
  },
  vacationRequests: [{
    startDate: { type: String },
    endDate: { type: String },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'active', 'completed', 'cancelled'], default: 'pending' },
    days: { type: Number, default: 0 },
    requestedAt: { type: Date, default: Date.now }
  }],
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  pushToken: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
