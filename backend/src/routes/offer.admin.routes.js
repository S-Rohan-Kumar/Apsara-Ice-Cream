import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { createoffer,
    updateoffer,
    deleteoffer } from "../controllers/admin.offcer.controller.js";
const router = Router();
router.get("/offers", authMiddleware,createoffer);
router.patch("/offers/:id",authMiddleware, updateoffer);
router.delete("/offers/:id",authMiddleware, deleteoffer);
export default router;