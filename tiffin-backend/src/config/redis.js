const Redis = require('ioredis');

let redisClient = null;

const connectRedis = () => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('⚠️  REDIS_URL not set. Redis features will use in-memory fallback.');
    return null;
  }

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    reconnectOnError: (err) => {
      console.error('❌ Redis reconnect error:', err.message);
      return false;
    },
  });

  client.on('connect', () => {
    console.log('🟥 Redis Connected successfully');
  });

  client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err.message);
  });

  client.on('close', () => {
    console.warn('⚠️  Redis connection closed');
  });

  client.connect().catch((err) => {
    console.error('❌ Redis initial connect failed:', err.message);
  });

  return client;
};

// Initialize once
redisClient = connectRedis();

/**
 * Helper: Store OTP in Redis with 5 min expiry
 * Key format: otp:<phone>
 */
const setOTP = async (phone, otp) => {
  if (!redisClient) {
    // Fallback to module-level memory store (used by authController)
    return false;
  }
  try {
    await redisClient.set(`otp:${phone}`, String(otp), 'EX', 300); // 5 minutes
    return true;
  } catch (err) {
    console.error('❌ Redis setOTP error:', err.message);
    return false;
  }
};

/**
 * Helper: Get OTP from Redis
 */
const getOTP = async (phone) => {
  if (!redisClient) return null;
  try {
    return await redisClient.get(`otp:${phone}`);
  } catch (err) {
    console.error('❌ Redis getOTP error:', err.message);
    return null;
  }
};

/**
 * Helper: Delete OTP from Redis after verification
 */
const deleteOTP = async (phone) => {
  if (!redisClient) return;
  try {
    await redisClient.del(`otp:${phone}`);
  } catch (err) {
    console.error('❌ Redis deleteOTP error:', err.message);
  }
};

module.exports = { redisClient, setOTP, getOTP, deleteOTP };
