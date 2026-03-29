import { redis } from "../utils/redis.js";

/**
 * CACHE MIDDLEWARE
 *
 * Usage:
 *   router.get("/categories", cache("categories", 600), getCategories);
 *   router.get("/products",   cache("products", 120, r => r.query.category || "all"), getProducts);
 *
 * On writes, call invalidate() in the controller:
 *   await invalidate("categories");
 *   await invalidate("products", "categories");  // bust multiple namespaces
 */

const NAMESPACE = "apsara";

export const cache = (prefix, ttl = 300, keyFn = null) =>
  async (req, res, next) => {
    const subKey = keyFn ? keyFn(req) : "all";
    const key    = `${NAMESPACE}:${prefix}:${subKey}`;

    try {
      const hit = await redis.get(key);
      if (hit) {
        res.setHeader("X-Cache", "HIT");
        return res.status(200).json(JSON.parse(hit));
      }
    } catch {
      // Redis down → fall through to DB, never crash the request
    }

    // Intercept res.json to populate cache on the way out
    const _json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 300) {
        // fire-and-forget — don't block the response on cache write
        redis.setex(key, ttl, JSON.stringify(body)).catch(() => {});
      }
      res.setHeader("X-Cache", "MISS");
      return _json(body);
    };

    next();
  };

/**
 * Pattern-delete all keys under one or more cache namespaces.
 * Call this inside any controller that mutates data.
 *
 * e.g. await invalidate("products", "categories")
 */
export const invalidate = async (...prefixes) => {
  try {
    const pipeline = redis.pipeline();
    
    for (const prefix of prefixes) {
      // 1. Log the pattern we are searching for (for your debugging)
      const pattern = `${NAMESPACE}:${prefix}*`;
      
      // 2. Use 'keys' carefully or 'scan'
      const keys = await redis.keys(pattern);
      
      if (keys && keys.length > 0) {
        console.log(`[Cache] Invalidating ${keys.length} keys for prefix: ${prefix} 🧹`);
        pipeline.del(...keys);
      } else {
        console.log(`[Cache] No keys found for prefix: ${prefix}`);
      }
    }
    
    await pipeline.exec();
  } catch (err) {
    console.error("[Cache] Invalidate failed:", err.message);
  }
};