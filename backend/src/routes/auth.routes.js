import { Router } from "express";
import {
  verifyAuth,
  getCurrentUser,
  updateProfile,
  saveFcmToken,
  deleteFcmToken,
  saveAddress,
  adminLogin,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

// Public — Firebase token in header
router.post("/auth/verify", verifyAuth);
router.post("/auth/admin-login", adminLogin);

// Protected — JWT in header
router.get("/auth/me", authMiddleware, getCurrentUser);
router.patch("/auth/update-profile", authMiddleware, updateProfile);

router
  .route("/users/fcm-token")
  .post(authMiddleware, saveFcmToken)
  .delete(authMiddleware, deleteFcmToken);

router.patch("/users/address", authMiddleware, saveAddress);

export default router;
