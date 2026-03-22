import {
  getActiveOffers, getAllOffers, createOffer, updateOffer, deleteOffer
} from "../controllers/offers.controller.js";
import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import adminMiddleware from "../middleware/admin.middleware.js";

const router = Router();

router.get("/active", getActiveOffers);

router
  .route("/")
  .get(authMiddleware, adminMiddleware, getAllOffers)
  .post(authMiddleware, adminMiddleware, createOffer);

router
  .route("/:id")
  .patch(authMiddleware, adminMiddleware, updateOffer)
  .delete(authMiddleware, adminMiddleware, deleteOffer);

export default router;
