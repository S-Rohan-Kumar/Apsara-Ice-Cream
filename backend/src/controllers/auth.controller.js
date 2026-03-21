import admin from "../config/firebase.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { APIResponse } from "../utils/api-response.js";
import { APIError } from "../utils/api-error.js";

//POST api/auth/resgister
const registerUser = asyncHandler(async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new APIError(401, "Firebase token missing");
  }

  const firebaseToken = header.split(" ")[1];
  const decoded = await admin.auth().verifyIdToken(firebaseToken);

  const firebaseUid = decoded.uid;
  const phone = decoded.phone_number;

  const role = phone === process.env.OWNER_PHONE ? "admin" : "customer";

  let user = await User.findOne({ firebaseUid });

  if (!user) {
    user = await User.create({
      firebaseUid,
      phone,
      role,
      name: "",
    });
  }

  const accessToken = jwt.sign(
    { _id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );

  return res
    .status(201)
    .json(new APIResponse(201, { accessToken, user }, "User authenticated"));
});

//GET api/auth/me
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new APIError(404, "User not found");
  return res.status(200).json(new APIResponse(200, user, "User found"));
});

//PATCH  api/auth/update-profile
const updateProfile = asyncHandler(async (req, res) => {
  const name = req.body.name;
  if (!name || !name.trim()) throw new APIError(400, "Name is required");
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { name: name.trim() } },
    { new: true },
  ).select("-firebaseUid");

  return res
    .status(200)
    .json(new APIResponse(200, user, "Profile updated successfully"));
});

//POST api/users/fcm-token
const saveFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new APIError(400, "FCM token is required");

  await User.findByIdAndUpdate(req.user._id, { $set: { fcmToken: token } });

  return res.status(200).json(new APIResponse(200, null, "FCM token saved"));
});

//DELETE api/users/fcm-token
const deleteFcmToken = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { fcmToken: null } });
  return res.status(200).json(new APIResponse(200, null, "FCM token cleared"));
});

//Patch api/users/address
const saveAddress = asyncHandler(async (req, res) => {
  const { text, location } = req.body;
  const user = User.findByIdAndUpdate(
    req.user._id,
    { $set: { defaultAddress: { text, location } } },
    { new: true },
  ).select("defaultAddress");

  return res
    .stats(200)
    .json(new APIResponse(200, user, "Address saved successfully"));
});

export {
  registerUser,
  getCurrentUser,
  updateProfile,
  saveFcmToken,
  deleteFcmToken,
  saveAddress,
};
