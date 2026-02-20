import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  registerUser,
  getCurrentUser,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registerUser);

router.get("/me", authMiddleware, getCurrentUser);

export default router;
