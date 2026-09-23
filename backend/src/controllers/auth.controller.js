import admin       from "../config/firebase.js";
import jwt         from "jsonwebtoken";
import User        from "../models/user.model.js";
import { redis }   from "../utils/redis.js";
import { sendSMS } from "../utils/sms.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { APIResponse }  from "../utils/api-response.js";
import { APIError }     from "../utils/api-error.js";

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days (1 month)

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
    { expiresIn: "30d" }  
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
  if (!token) throw new APIError(400, "Device push token is required");

  const isExpo = token.startsWith("ExponentPushToken") || token.startsWith("ExpoPushToken");
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      fcmToken: token,
      pushToken: isExpo ? token : null,
    },
  });
  return res.status(200).json(new APIResponse(200, null, "Device push token registered"));
});

// DELETE /api/users/fcm-token
const deleteFcmToken = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { fcmToken: null, pushToken: null } });
  return res.status(200).json(new APIResponse(200, null, "Device push token cleared"));
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

// POST /api/auth/send-otp
const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) throw new APIError(400, "Phone number is required");

  const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);
  if (cleanPhone.length < 10) throw new APIError(400, "Invalid 10-digit mobile number");

  const cooldown = await redis.ttl(`otp_cooldown:${cleanPhone}`);
  if (cooldown > 0) {
    return res.status(429).json(
      new APIResponse(429, { cooldown }, `Please wait ${cooldown}s before requesting a new OTP`)
    );
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  await redis.setex(`otp:${cleanPhone}`, 300, otpCode);
  await redis.setex(`otp_cooldown:${cleanPhone}`, 45, "1");
  await redis.del(`otp_attempts:${cleanPhone}`).catch(() => {});

  console.log(`\n======================================================`);
  console.log(`🍦 [APSARA OTP] +91${cleanPhone} -> Verification Code: ${otpCode}`);
  console.log(`⏱️  Valid for 5 minutes (300 seconds) | Cooldown: 45s`);
  console.log(`======================================================\n`);

  sendSMS(cleanPhone, otpCode).catch((err) => {
    console.warn(`[SMS Service] Async error sending SMS:`, err.message);
  });

  return res.status(200).json(
    new APIResponse(
      200,
      { phone: cleanPhone, expiresIn: 300, cooldown: 45, testOtp: otpCode },
      "OTP sent successfully"
    )
  );
});

// POST /api/auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp, name } = req.body;
  if (!phone || !otp) throw new APIError(400, "Phone and OTP are required");

  const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);
  if (cleanPhone.length < 10) throw new APIError(400, "Invalid mobile number");

  const attemptsStr = await redis.get(`otp_attempts:${cleanPhone}`);
  const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
  if (attempts >= 5) {
    throw new APIError(429, "Too many failed attempts. Please request a new OTP.");
  }

  const cachedOtp = await redis.get(`otp:${cleanPhone}`);
  if (!cachedOtp) {
    throw new APIError(400, "OTP has expired or was not requested. Please request a new one.");
  }

  const cleanInputOtp = otp.toString().trim();
  if (cleanInputOtp !== cachedOtp) {
    await redis.incr(`otp_attempts:${cleanPhone}`);
    await redis.expire(`otp_attempts:${cleanPhone}`, 300);
    throw new APIError(400, "Invalid 6-digit OTP. Please check the code.");
  }

  await redis.del(`otp:${cleanPhone}`).catch(() => {});
  await redis.del(`otp_attempts:${cleanPhone}`).catch(() => {});
  await redis.del(`otp_cooldown:${cleanPhone}`).catch(() => {});

  const formattedPhone = `+91${cleanPhone}`;
  const role = formattedPhone === process.env.ADMIN_PHONE ? "admin" : "customer";

  let user = await User.findOne({ phone: formattedPhone });
  let isNewUser = false;

  if (!user) {
    user = await User.create({
      firebaseUid: `phone_${cleanPhone}_${Date.now()}`,
      phone: formattedPhone,
      name: name?.trim() || "",
      role,
    });
    isNewUser = true;
  }

  const { accessToken, payload } = await createSession(user);

  return res.status(200).json(
    new APIResponse(
      200,
      { accessToken, isNewUser, user: payload },
      isNewUser ? "Account created" : "Login successful"
    )
  );
});

export {
  verifyAuth,
  sendOtp,
  verifyOtp,
  adminLogin,
  logout,
  getCurrentUser,
  updateProfile,
  saveFcmToken,
  deleteFcmToken,
  saveAddress,
};
