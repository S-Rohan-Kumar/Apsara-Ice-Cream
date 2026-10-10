import {
  getActiveOffers, getAllOffers, createOffer, updateOffer, deleteOffer
} from "../controllers/offers.controller.js";
import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { requireOwnerMiddleware } from "../middleware/admin.middleware.js";

const router = Router();

router.get("/active", getActiveOffers);

router
  .route("/")
  .get(authMiddleware, requireOwnerMiddleware, getAllOffers)
  .post(authMiddleware, requireOwnerMiddleware, createOffer);

router
  .route("/:id")
  .patch(authMiddleware, requireOwnerMiddleware, updateOffer)
  .delete(authMiddleware, requireOwnerMiddleware, deleteOffer);

export default router;
