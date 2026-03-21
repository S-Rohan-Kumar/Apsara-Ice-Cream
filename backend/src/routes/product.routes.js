import {
  getProducts,
  getProductDetails,
  createProduct,
  updateProduct,
  toggleStock,
  deleteProduct,
} from "../controllers/product.controller.js";
import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import adminMiddleware from "../middleware/admin.middleware.js";
import multer from "multer";
import { upload } from "../middleware/multer.midleware.js";

const router = Router();

router
  .route("/")
  .get(getProducts)
  .post(authMiddleware, adminMiddleware, upload.single("image"), createProduct);

router
  .route("/:id")
  .get(getProductDetails)
  .patch(authMiddleware, adminMiddleware, upload.single("image"), updateProduct)
  .delete(authMiddleware, adminMiddleware, deleteProduct);

router
  .route("/:id/toggle-stock")
  .patch(authMiddleware, adminMiddleware, toggleStock);

export default router;
