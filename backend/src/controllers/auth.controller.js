import admin from '../config/firebase.js';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { APIResponse } from '../utils/api-response.js';
import { APIError } from '../utils/api-error.js';

// POST /api/auth/verify — handles both register and login
const verifyAuth = asyncHandler(async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new APIError(401, 'Firebase token missing');
  }

  const firebaseToken = header.split(' ')[1];
  const decoded       = await admin.auth().verifyIdToken(firebaseToken);

  const firebaseUid = decoded.uid;
  const phone       = decoded.phone_number;

  if (!phone) {
    throw new APIError(400, 'Phone number not found in token');
  }

  const role = phone === process.env.ADMIN_PHONE ? 'admin' : 'customer';

  let user      = await User.findOne({ firebaseUid });
  let isNewUser = false;

  if (!user) {
    user = await User.create({
      firebaseUid,
      phone,
      role,
      name: '',
    });
    isNewUser = true;
  } else {
    // Update role in case ADMIN_PHONE changed
    if (user.role !== role) {
      user.role = role;
      await user.save();
    }
  }

  const accessToken = jwt.sign(
    { _id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return res.status(200).json(
    new APIResponse(200, {
      accessToken,
      isNewUser,
      user: {
        _id  : user._id,
        phone: user.phone,
        name : user.name,
        role : user.role,
      },
    }, isNewUser ? 'Account created' : 'Login successful')
  );
});

// GET /api/auth/me
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-firebaseUid');
  if (!user) throw new APIError(404, 'User not found');
  return res.status(200).json(new APIResponse(200, user, 'User found'));
});

// PATCH /api/auth/update-profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) throw new APIError(400, 'Name is required');

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { name: name.trim() } },
    { new: true }
  ).select('-firebaseUid');

  if (!user) throw new APIError(404, 'User not found');

  return res.status(200).json(new APIResponse(200, user, 'Profile updated'));
});

// POST /api/users/fcm-token
const saveFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new APIError(400, 'FCM token is required');

  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { fcmToken: token } }
  );

  return res.status(200).json(new APIResponse(200, null, 'FCM token saved'));
});

// DELETE /api/users/fcm-token
const deleteFcmToken = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { fcmToken: null } }
  );
  return res.status(200).json(new APIResponse(200, null, 'FCM token cleared'));
});

// PATCH /api/users/address
const saveAddress = asyncHandler(async (req, res) => {
  const { text, location } = req.body;

  if (!text || !location?.lat || !location?.lng) {
    throw new APIError(400, 'text, location.lat and location.lng are required');
  }

  const user = await User.findByIdAndUpdate(  // ✅ await added
    req.user._id,
    { $set: { defaultAddress: { text, location } } },
    { new: true }
  ).select('defaultAddress');

  return res.status(200).json(new APIResponse(200, user, 'Address saved'));  // ✅ status not stats
});

export {
  verifyAuth,
  getCurrentUser,
  updateProfile,
  saveFcmToken,
  deleteFcmToken,
  saveAddress,
};