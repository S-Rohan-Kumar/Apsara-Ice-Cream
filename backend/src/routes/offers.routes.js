import {
  getActiveOffers, getAllOffers, createOffer, updateOffer, deleteOffer
} from "../controllers/offers.controller.js";
import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { requireOwnerMiddleware } from "../middleware/admin.middleware.js";
import { upload } from "../middleware/multer.midleware.js";

const router = Router();

router.get("/active", getActiveOffers);

router
  .route("/")
  .get(authMiddleware, requireOwnerMiddleware, getAllOffers)
  .post(authMiddleware, requireOwnerMiddleware, upload.single("image"), createOffer);

router
  .route("/:id")
  .patch(authMiddleware, requireOwnerMiddleware, upload.single("image"), updateOffer)
  .delete(authMiddleware, requireOwnerMiddleware, deleteOffer);

export default router;
