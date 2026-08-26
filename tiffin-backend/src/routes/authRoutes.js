const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  authUser, 
  getUserProfile, 
  updateUserProfile, 
  phoneLogin, 
  riderLogin,
  riderSignup,
  sendOTP,
  firebaseLogin
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { authLimiter, otpLimiter } = require('../middlewares/rateLimiter');

// 🔐 Auth routes – strict rate limiting (10 requests / 15 min per IP)
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, authUser);
router.post('/firebase-login', authLimiter, firebaseLogin);
router.post('/rider-login', authLimiter, riderLogin);
router.post('/rider-signup', authLimiter, riderSignup);

// 📱 OTP routes – 5 requests / 10 min per IP
router.post('/phone-login', otpLimiter, phoneLogin);
router.post('/send-otp', otpLimiter, sendOTP);

// 👤 Profile routes – protected, no extra rate limit (general limiter covers it)
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

module.exports = router;
