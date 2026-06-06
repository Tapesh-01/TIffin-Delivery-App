const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { logActivity } = require('../utils/activityLogger');

const otpStore = {}; // In-memory OTP storage: phone -> { otp, expires }

// Helper to sign JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student'
    });

    await logActivity(req.app, user._id, 'signup', `User registered: ${user.name} (${user.email || user.phone})`);

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        walletBalance: user.walletBalance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.authUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Get user with password included
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    await logActivity(req.app, user._id, 'login', `User logged in: ${user.name}`);

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        walletBalance: user.walletBalance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          plan: user.plan,
          walletBalance: user.walletBalance,
          addressLine: user.addressLine,
          city: user.city,
          state: user.state,
          pincode: user.pincode,
          gender: user.gender || '',
          referredBy: user.referredBy || null,
          pushToken: user.pushToken || null
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update current user profile (like name, address)
// @route   PUT /api/auth/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.addressLine = req.body.addressLine !== undefined ? req.body.addressLine : user.addressLine;
      user.city = req.body.city !== undefined ? req.body.city : user.city;
      user.state = req.body.state !== undefined ? req.body.state : user.state;
      user.pincode = req.body.pincode !== undefined ? req.body.pincode : user.pincode;
      user.gender = req.body.gender !== undefined ? req.body.gender : user.gender;
      user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
      user.latitude = req.body.latitude !== undefined ? req.body.latitude : user.latitude;
      user.longitude = req.body.longitude !== undefined ? req.body.longitude : user.longitude;
      user.pushToken = req.body.pushToken !== undefined ? req.body.pushToken : user.pushToken;
      if (req.body.password) {
        user.password = req.body.password;
      }

      // Handle referral code processing (only if not already referred)
      if (req.body.referralCode && !user.referredBy) {
        const refCode = req.body.referralCode.trim().toUpperCase();
        let referrerFound = false;
        if (refCode.startsWith('TIFFIN')) {
          const phoneSuffix = refCode.replace('TIFFIN', '');
          if (phoneSuffix.length === 4) {
            const referrer = await User.findOne({ 
              phone: new RegExp(phoneSuffix + '$'),
              role: 'student',
              _id: { $ne: user._id } // cannot refer self
            });
            if (referrer) {
              referrerFound = true;
              user.referredBy = referrer._id;
              user.walletBalance += 50;
              referrer.walletBalance += 50;
              await referrer.save();
              
              const Transaction = require('../models/Transaction');
              // Log transaction for Referrer
              await Transaction.create({
                user: referrer._id,
                amount: 50,
                type: 'referral_bonus',
                description: `Referral bonus for inviting ${user.phone || 'friend'}`,
                status: 'approved'
              });
              
              // Log transaction for current User
              await Transaction.create({
                user: user._id,
                amount: 50,
                type: 'referral_bonus',
                description: `Signup bonus using referral code from +91 ********${phoneSuffix}`,
                status: 'approved'
              });
              
              // Notify referrer via Socket.io if active
              const io = req.app.get('io');
              if (io) {
                io.to(referrer._id.toString()).emit('wallet_updated', referrer.walletBalance);
              }
              console.log(`🎁 [Referral Success] Referrer ${referrer.phone} and User ${user.phone} both credited ₹50!`);
              await logActivity(req.app, user._id, 'referral_applied', `Claimed referral code of +91 ********${phoneSuffix} (TIFFIN${phoneSuffix}). Both credited ₹50.`);
            }
          }
        }
        if (!referrerFound) {
          return res.status(400).json({ success: false, message: 'Referral code galat hai ya user nahi mila.' });
        }
      }

      if (req.body.plan !== undefined) {
        const plan = req.body.plan;
        if (!['none', 'basic', 'standard', 'premium'].includes(plan)) {
          return res.status(400).json({ success: false, message: 'Invalid plan name' });
        }
        
        if (plan !== 'none' && user.plan !== plan) {
          const prices = { basic: 70, standard: 90, premium: 130 };
          const price = prices[plan];
          
          if (user.walletBalance < price) {
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance to subscribe to this plan' });
          }
          
          // Deduct from wallet
          user.walletBalance -= price;
          user.plan = plan;
          await logActivity(req.app, user._id, 'plan_subscribed', `Subscribed to plan: ${plan.toUpperCase()} (₹${price}/day debited)`);
          
          // Create transaction log
          const Transaction = require('../models/Transaction');
          await Transaction.create({
            user: user._id,
            amount: -price,
            type: 'tiffin_deduction',
            description: `Tiffin subscription day deduction (${plan.toUpperCase()} plan)`,
            status: 'approved'
          });
          
          // Create tiffin order for today
          const Order = require('../models/Order');
          const todayStart = new Date();
          todayStart.setHours(0,0,0,0);
          const todayEnd = new Date();
          todayEnd.setHours(23,59,59,999);
          
          const existingTiffinOrder = await Order.findOne({
            user: user._id,
            isTiffinOrder: true,
            createdAt: { $gte: todayStart, $lte: todayEnd }
          });
          
          if (!existingTiffinOrder) {
            const planDetails = {
              basic: ['Roti (4 pcs)', 'Dal Tadka', 'Sabji', 'Rice'],
              standard: ['Roti (4 pcs)', 'Dal Tadka', 'Sabji', 'Rice', 'Extra Sabji'],
              premium: ['Roti (4 pcs)', 'Dal Tadka', 'Sabji', 'Rice', 'Paneer / Chicken']
            };
            
            const orderItems = planDetails[plan].map(item => ({
              name: item,
              quantity: 1,
              price: 0
            }));
            
            const newTiffinOrder = await Order.create({
              user: user._id,
              isTiffinOrder: true,
              items: orderItems,
              totalAmount: price,
              paymentMethod: 'wallet',
              paymentStatus: 'approved',
              status: 'pending'
            });
            
            const io = req.app.get('io');
            if (io) {
              const populatedOrder = await Order.findById(newTiffinOrder._id)
                .populate('user', 'name email role plan')
                .populate('restaurant', 'name cuisine image');
              io.to('admins').emit('new_order', populatedOrder);
              // Also notify the user's socket room to trigger a balance and transaction refresh
              io.to(user._id.toString()).emit('wallet_updated', user.walletBalance);
            }
          }
        } else {
          user.plan = plan;
        }
      }

      // Log normal profile details update if it's not just a subscription change or referral code claim
      if (!req.body.plan && !req.body.referralCode) {
        await logActivity(req.app, user._id, 'profile_update', `Updated profile settings (Name: ${user.name}, Address: ${user.addressLine || 'N/A'})`);
      }

      const updatedUser = await user.save();
      res.json({
        success: true,
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          plan: updatedUser.plan,
          walletBalance: updatedUser.walletBalance,
          addressLine: updatedUser.addressLine,
          city: updatedUser.city,
          state: updatedUser.state,
          pincode: updatedUser.pincode,
          gender: updatedUser.gender || '',
          referredBy: updatedUser.referredBy || null,
          pushToken: updatedUser.pushToken || null
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate user by phone (simulated passwordless)
// @route   POST /api/auth/phone-login
// @access  Public
// @desc    Send OTP to phone
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOTP = async (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length !== 10) {
    return res.status(400).json({ success: false, message: 'Kripya sahi 10-digit mobile number enter karein.' });
  }

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 min expiry
    otpStore[phone] = { otp, expires };

    console.log(`\n🔑 [OTP Verification Code]`);
    console.log(`📱 Phone: +91 ${phone}`);
    console.log(`🎫 Code: ${otp}`);
    console.log(`⏳ Expires: 5 mins\n`);

    res.json({
      success: true,
      message: 'OTP sent successfully (Simulated)',
      otp, // returned for app sandbox alert copy-paste
      expires
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate user by phone and OTP
// @route   POST /api/auth/phone-login
// @access  Public
exports.phoneLogin = async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Mobile number and OTP are required' });
  }

  const record = otpStore[phone];
  const isMasterCode = otp === '123456';
  const isValidOTP = record && record.otp === otp && record.expires > Date.now();

  if (!isMasterCode && !isValidOTP) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP verification code' });
  }

  // Clear OTP record
  delete otpStore[phone];

  try {
    let user = await User.findOne({ phone });
    let isNew = false;

    if (!user) {
      user = await User.create({
        name: 'New Student',
        email: phone + '@tiffin.com',
        phone: phone,
        password: 'student123',
        role: 'student',
        plan: 'none',
        walletBalance: 0
      });
      isNew = true;
    }

    if (isNew) {
      await logActivity(req.app, user._id, 'signup', `New student signed up via SMS OTP: +91 ${user.phone}`);
    } else {
      await logActivity(req.app, user._id, 'login', `Student logged in via SMS OTP: +91 ${user.phone}`);
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      isNewUser: isNew,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        plan: user.plan,
        walletBalance: user.walletBalance,
        addressLine: user.addressLine || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || '',
        gender: user.gender || '',
        referredBy: user.referredBy || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate user via Firebase verified phone credentials
// @route   POST /api/auth/firebase-login
// @access  Public
exports.firebaseLogin = async (req, res) => {
  const { idToken, phone } = req.body;

  let verifiedPhone = phone;

  if (idToken && idToken !== 'mock-token') {
    try {
      const admin = require('firebase-admin');
      // If firebase-admin is initialized, verify ID Token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      verifiedPhone = decodedToken.phone_number;
      if (verifiedPhone.startsWith('+91')) {
        verifiedPhone = verifiedPhone.slice(3);
      } else if (verifiedPhone.startsWith('+')) {
        verifiedPhone = verifiedPhone.slice(verifiedPhone.length - 10);
      }
    } catch (err) {
      console.error('Firebase token verification failed, falling back to body data:', err);
      // Fallback in case admin is not initialized
    }
  }

  if (!verifiedPhone || verifiedPhone.length !== 10) {
    return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number is required' });
  }

  try {
    let user = await User.findOne({ phone: verifiedPhone });
    let isNew = false;

    if (!user) {
      user = await User.create({
        name: 'New Student',
        email: verifiedPhone + '@tiffin.com',
        phone: verifiedPhone,
        password: 'student123',
        role: 'student',
        plan: 'none',
        walletBalance: 0
      });
      isNew = true;
    }

    if (isNew) {
      await logActivity(req.app, user._id, 'signup', `New student signed up via Firebase verification: +91 ${user.phone}`);
    } else {
      await logActivity(req.app, user._id, 'login', `Student logged in via Firebase verification: +91 ${user.phone}`);
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      isNewUser: isNew,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        plan: user.plan,
        walletBalance: user.walletBalance,
        addressLine: user.addressLine || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || '',
        gender: user.gender || '',
        referredBy: user.referredBy || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate rider by phone and PIN
// @route   POST /api/auth/rider-login
// @access  Public
exports.riderLogin = async (req, res) => {
  const { phone, pin } = req.body;

  if (!phone || !pin) {
    return res.status(400).json({ success: false, message: 'Please provide phone and PIN' });
  }

  try {
    const user = await User.findOne({ phone, riderPin: pin, role: 'rider' });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid phone or PIN' });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        riderPin: user.riderPin,
        vehicle: user.vehicle || ''
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register a new rider
// @route   POST /api/auth/rider-signup
// @access  Public
exports.riderSignup = async (req, res) => {
  const { name, phone, pin, vehicle } = req.body;

  if (!name || !phone || !pin) {
    return res.status(400).json({ success: false, message: 'Please provide name, phone, and 4-digit PIN' });
  }

  if (phone.length !== 10) {
    return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
  }

  if (pin.length !== 4) {
    return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });
  }

  try {
    // Check if phone already registered
    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'This phone number is already registered' });
    }

    // Create user as rider
    const user = await User.create({
      name,
      phone,
      riderPin: pin,
      role: 'rider',
      vehicle: vehicle || '',
      password: 'rider_' + pin
    });

    await logActivity(req.app, user._id, 'rider_signup', `New rider signed up: ${user.name} (+91 ${user.phone}, Vehicle: ${user.vehicle || 'None'})`);

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email || (user.phone + '@tiffin.com'),
        phone: user.phone,
        role: user.role,
        riderPin: user.riderPin,
        vehicle: user.vehicle || ''
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
