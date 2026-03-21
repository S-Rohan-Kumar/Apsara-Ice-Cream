import {
  getactiveoffers,
  createoffer,
  updateoffer,
  deleteoffer,
  getAllOffers,
} from "../controllers/offers.controller.js";
import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import adminMiddleware from "../middleware/admin.middleware.js";

const router = Router();

router.get("/active", getactiveoffers);

router
  .route("/")
  .get(authMiddleware, adminMiddleware, getAllOffers)
  .post(authMiddleware, adminMiddleware, createoffer);

router
  .route("/:id")
  .patch(authMiddleware, adminMiddleware, updateoffer)
  .delete(authMiddleware, adminMiddleware, deleteoffer);

export default router;
