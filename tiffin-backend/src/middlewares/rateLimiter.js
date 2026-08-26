const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../config/redis');

/**
 * Helper: Create rate limit store
 * Uses Redis if client is available, otherwise falls back to in-memory.
 */
const createStore = (prefix) => {
  if (redisClient) {
    return new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: `rl:${prefix}:`,
    });
  }
  // In-memory fallback (default behavior when store is not provided)
  return undefined;
};

/**
 * 🔐 AUTH Limiter
 * Routes: /login, /register, /firebase-login, /rider-login, /rider-signup
 * Limit: 10 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('auth'),
  message: {
    success: false,
    message: '⛔ Bahut zyada login attempts. 15 minute baad try karein.',
  },
  handler: (req, res, next, options) => {
    console.warn(`🚨 [RateLimit:Auth] IP ${req.ip} blocked on ${req.originalUrl}`);
    res.status(429).json(options.message);
  },
});

/**
 * 📱 OTP Limiter
 * Routes: /send-otp, /phone-login
 * Limit: 5 requests per 10 minutes per IP
 */
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('otp'),
  message: {
    success: false,
    message: '⛔ OTP requests ki limit paar ho gayi. 10 minute baad try karein.',
  },
  handler: (req, res, next, options) => {
    console.warn(`🚨 [RateLimit:OTP] IP ${req.ip} blocked on ${req.originalUrl}`);
    res.status(429).json(options.message);
  },
});

/**
 * 🌐 General API Limiter
 * Routes: All /api/* routes
 * Limit: 200 requests per 1 minute per IP
 */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('general'),
  message: {
    success: false,
    message: '⛔ Bahut zyada requests bheje. 1 minute baad try karein.',
  },
  handler: (req, res, next, options) => {
    console.warn(`🚨 [RateLimit:General] IP ${req.ip} blocked on ${req.originalUrl}`);
    res.status(429).json(options.message);
  },
  skip: (req) => {
    // Skip rate limiting for admin users (based on role if token already decoded)
    // Note: Full admin bypass is done via authorize() middleware on admin routes
    return false;
  },
});

module.exports = { authLimiter, otpLimiter, generalLimiter };
