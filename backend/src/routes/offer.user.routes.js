import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { getactiveoffers } from "../controllers/offers.controller.js";
const router = Router();
router.get("/active",authMiddleware, getactiveoffers);