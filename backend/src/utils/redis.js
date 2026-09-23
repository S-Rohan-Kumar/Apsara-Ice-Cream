import Redis from "ioredis";

const isTLS = process.env.REDIS_TLS === "true";

export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy(times) {
        return Math.min(times * 200, 10_000);
      },
    })
  : new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      tls: isTLS ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy(times) {
        return Math.min(times * 200, 10_000);
      },
    });

redis.on("connect", () => {
  const provider = isTLS ? "Cloud/Upstash (TLS)" : "Local Docker";
  console.log(`[Redis] Connected to ${provider} on port ${process.env.REDIS_PORT || 6379} 🚀`);
});

redis.on("error", (err) => console.error("[Redis] Error:", err.message));
redis.on("reconnecting", () => console.warn("[Redis] Reconnecting..."));