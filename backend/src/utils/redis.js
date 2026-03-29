import Redis from "ioredis";

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  // CRITICAL: Upstash requires TLS (SSL)
  tls: {}, 
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  retryStrategy(times) {
    return Math.min(times * 200, 10_000);
  },
});

redis.on("connect", () => console.log("[Redis] Connected to Upstash 🚀"));
redis.on("error", (err) => console.error("[Redis] Error:", err.message));
redis.on("reconnecting", () => console.warn("[Redis] Reconnecting..."));