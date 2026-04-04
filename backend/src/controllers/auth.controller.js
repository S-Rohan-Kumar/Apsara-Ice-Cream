import admin       from "../config/firebase.js";
import jwt         from "jsonwebtoken";
import User        from "../models/user.model.js";
import { redis }   from "../utils/redis.js";
import { asyncHandler } from "../utils/async-handler.js";
import { APIResponse }  from "../utils/api-response.js";
import { APIError }     from "../utils/api-error.js";

const SESSION_TTL = 60 * 60 * 8; // 8 hours

const createSession = async (user) => {
  const payload = {
    _id  : user._id.toString(),
    phone: user.phone,
    name : user.name,
    role : user.role,
  };

  // Write to Redis — this is what auth middleware reads instead of DB
  await redis.setex(`session:${user._id}`, SESSION_TTL, JSON.stringify(payload));

  const accessToken = jwt.sign(
    { _id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }  
  );

  return { accessToken, payload };
};

// POST /api/auth/verify — Firebase phone auth (customer + admin via phone)
const verifyAuth = asyncHandler(async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new APIError(401, "Firebase token missing");
  }

  const firebaseToken = header.split(" ")[1];
  const decoded = await admin.auth().verifyIdToken(firebaseToken);

  const { uid: firebaseUid, phone_number: phone } = decoded;
  if (!phone) throw new APIError(400, "Phone number not found in token");

  const role = phone === process.env.ADMIN_PHONE ? "admin" : "customer";

  const result = await User.findOneAndUpdate(
    { firebaseUid },
    {
      $setOnInsert: { firebaseUid, phone, name: "" },
      $set: { role },
    },
    { 
      upsert: true, 
      returnDocument: 'after', 
      includeResultMetadata: true 
    }
  );

  const user = result.value;
  
  if (!user) {
    throw new APIError(500, "Failed to synchronize user data");
  }

  const isNewUser = result.lastErrorObject?.updatedExisting === false;

  const { accessToken, payload } = await createSession(user);

  return res.status(200).json(
    new APIResponse(
      200, 
      { accessToken, isNewUser, user: payload },
      isNewUser ? "Account created" : "Login successful"
    )
  );
});

// POST /api/auth/admin-login 
const adminLogin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new APIError(400, "Username and password required");
  }

  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    throw new APIError(401, "Invalid credentials");
  }
  const adminUser = await User.findOne({ role: 'admin' })
    .select("_id phone name role")
    .lean();

  if (!adminUser) throw new APIError(404, "Admin account not found");

  const { accessToken, payload } = await createSession(adminUser);

  return res.status(200).json(
    new APIResponse(200, { accessToken, user: payload }, "Admin login successful")
  );
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  await redis.del(`session:${req.user._id}`);
  return res.status(200).json(new APIResponse(200, null, "Logged out"));
});

// GET /api/auth/me
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-firebaseUid")
    .lean();

  if (!user) throw new APIError(404, "User not found");
  return res.status(200).json(new APIResponse(200, user, "User found"));
});

// PATCH /api/auth/update-profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) throw new APIError(400, "Name is required");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { name: name.trim() } },
    { new: true, select: "-firebaseUid" }
  ).lean();

  if (!user) throw new APIError(404, "User not found");

  // Update session in Redis so subsequent /me calls return fresh name
  const sessionKey = `session:${req.user._id}`;
  const cached = await redis.get(sessionKey);
  if (cached) {
    const session = JSON.parse(cached);
    session.name = user.name;
    await redis.setex(sessionKey, 60 * 60 * 8, JSON.stringify(session));
  }

  return res.status(200).json(new APIResponse(200, user, "Profile updated"));
});

// POST /api/users/fcm-token
const saveFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new APIError(400, "FCM token is required");

  await User.findByIdAndUpdate(req.user._id, { $set: { fcmToken: token } });
  return res.status(200).json(new APIResponse(200, null, "FCM token saved"));
});

// DELETE /api/users/fcm-token
const deleteFcmToken = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { fcmToken: null } });
  return res.status(200).json(new APIResponse(200, null, "FCM token cleared"));
});

// PATCH /api/users/address
const saveAddress = asyncHandler(async (req, res) => {
  const { text, location } = req.body;
  if (!text || !location?.lat || !location?.lng) {
    throw new APIError(400, "text, location.lat and location.lng are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { defaultAddress: { text, location } } },
    { new: true, select: "defaultAddress" }
  ).lean();

  return res.status(200).json(new APIResponse(200, user, "Address saved"));
});

export {
  verifyAuth,
  adminLogin,
  logout,
  getCurrentUser,
  updateProfile,
  saveFcmToken,
  deleteFcmToken,
  saveAddress,
};