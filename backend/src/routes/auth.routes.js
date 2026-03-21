import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  registerUser,
  getCurrentUser,
  updateProfile,
  saveFcmToken,
  deleteFcmToken,
  saveAddress,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/auth/register", registerUser);

router.get("/auth/me", authMiddleware, getCurrentUser);
router.patch("/auth/update-profile", authMiddleware, updateProfile);

router
  .route("/users/fcm-token")
  .post(authMiddleware, saveFcmToken)
  .delete(authMiddleware, deleteFcmToken);
router.patch("/users/address" , authMiddleware , saveAddress);

export default router;
