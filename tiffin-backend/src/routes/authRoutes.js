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

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/phone-login', phoneLogin);
router.post('/send-otp', sendOTP);
router.post('/firebase-login', firebaseLogin);
router.post('/rider-login', riderLogin);
router.post('/rider-signup', riderSignup);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

module.exports = router;
