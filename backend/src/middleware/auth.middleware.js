import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { redis }  from "../utils/redis.js";

const SESSION_TTL = 60 * 60 * 8;

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    console.log(`This is header : ${header}`)

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const sessionKey = `session:${decoded._id}`;
    let sessionData;

    console.log(`This is token : ${token}`)
    console.log(decoded)

    try {
      const cached = await redis.get(sessionKey);
      if(!cached){
        return res.status(401).json({
          success: false,
          message: "Session expired, please log in again",
        });
      }
      sessionData = JSON.parse(cached);
    } catch (error) {
      console.error("[Auth] Redis unavailable, falling back to JWT-only:", redisErr.message);
      const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;
      if (tokenAge > 300) {
        return res.status(503).json({ success: false, message: "Auth service temporarily unavailable" });
      }
      sessionData = { _id: decoded._id, role: decoded.role };
    }

    req.user = sessionData;
    redis.expire(sessionKey, SESSION_TTL).catch(() => {});
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export const invalidateSession = async (userId) => {
  await redis.del(`session:${userId.toString()}`);
};

export default authMiddleware;