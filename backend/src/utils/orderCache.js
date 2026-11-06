import { redis } from './redis.js';
import { APIError } from './api-error.js';

// In-memory fallbacks when Redis is offline
const inMemoryGpsCache = new Map();
const inMemoryOtpFailures = new Map();

/**
 * Cache high-frequency rider GPS coordinates in Redis Hash (with fallback)
 * TTL: 2 hours (7200 seconds)
 */
export const setCachedRiderLocation = async (orderId, loc) => {
  if (!orderId || !loc) return;
  const idStr = String(orderId);
  inMemoryGpsCache.set(idStr, loc);

  try {
    if (redis && redis.status === 'ready') {
      const key = `order:gps:${idStr}`;
      await redis.hset(key, {
        lat: String(loc.lat),
        lng: String(loc.lng),
        heading: String(loc.heading || 0),
        updatedAt: new Date(loc.updatedAt || Date.now()).toISOString(),
      });
      await redis.expire(key, 7200);
    }
  } catch (_) {
    // Non-fatal, in-memory cache holds state
  }
};

/**
 * Retrieve the latest cached rider GPS coordinates
 */
export const getCachedRiderLocation = async (orderId) => {
  if (!orderId) return null;
  const idStr = String(orderId);

  try {
    if (redis && redis.status === 'ready') {
      const data = await redis.hgetall(`order:gps:${idStr}`);
      if (data && data.lat && data.lng) {
        return {
          lat: Number(data.lat),
          lng: Number(data.lng),
          heading: Number(data.heading || 0),
          updatedAt: new Date(data.updatedAt || Date.now()),
        };
      }
    }
  } catch (_) {}

  return inMemoryGpsCache.get(idStr) || null;
};

/**
 * Delete cached rider location when order delivery completes
 */
export const clearCachedRiderLocation = async (orderId) => {
  if (!orderId) return;
  const idStr = String(orderId);
  inMemoryGpsCache.delete(idStr);

  try {
    if (redis && redis.status === 'ready') {
      await redis.del(`order:gps:${idStr}`);
    }
  } catch (_) {}
};

/**
 * Brute-force protection: rate-limit OTP verification attempts
 * Limit: 5 failed attempts per 15 minutes per orderId
 */
export const checkOtpRateLimit = async (orderId) => {
  const idStr = String(orderId);
  const key = `otp_fail:${idStr}`;
  let count = 0;

  try {
    if (redis && redis.status === 'ready') {
      const val = await redis.get(key);
      count = val ? parseInt(val, 10) : 0;
    } else {
      const entry = inMemoryOtpFailures.get(idStr);
      if (entry && entry.expiresAt > Date.now()) {
        count = entry.count;
      } else {
        inMemoryOtpFailures.delete(idStr);
      }
    }
  } catch (_) {}

  if (count >= 5) {
    throw new APIError(
      429,
      'Too many incorrect OTP attempts. For security, please wait 15 minutes before trying again.'
    );
  }
};

/**
 * Record a failed OTP verification attempt
 */
export const recordOtpFailure = async (orderId) => {
  const idStr = String(orderId);
  const key = `otp_fail:${idStr}`;

  try {
    if (redis && redis.status === 'ready') {
      const attempts = await redis.incr(key);
      if (attempts === 1) {
        await redis.expire(key, 900); // 15 mins TTL
      }
    } else {
      const entry = inMemoryOtpFailures.get(idStr);
      const count = entry && entry.expiresAt > Date.now() ? entry.count + 1 : 1;
      inMemoryOtpFailures.set(idStr, { count, expiresAt: Date.now() + 900000 });
    }
  } catch (_) {}
};

/**
 * Clear failed OTP attempts counter upon successful verification
 */
export const clearOtpFailures = async (orderId) => {
  const idStr = String(orderId);
  inMemoryOtpFailures.delete(idStr);

  try {
    if (redis && redis.status === 'ready') {
      await redis.del(`otp_fail:${idStr}`);
    }
  } catch (_) {}
};
