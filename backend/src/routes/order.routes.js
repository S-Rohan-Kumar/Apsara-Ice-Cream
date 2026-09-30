import { Router } from "express";
import {
  initiateOrder,
  confirmOrder,
  getMyOrders,
  getOrderDetails,
  cancelOrder,
  getAdminOrders,
  getAdminOrderDetails,
  updateOrderStatus,
  getMonthlyReport,
  getRiderOrderDetails,
  updateRiderLocation,
} from "../controllers/orders.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import adminMiddleware from "../middleware/admin.middleware.js";

const router = Router();

router.get("/rider-track/:id", getRiderOrderDetails);
router.post("/rider-track/:id/location", updateRiderLocation);

router.post("/initiate", authMiddleware, initiateOrder);
router.post("/confirm", authMiddleware, confirmOrder);
router.get("/my", authMiddleware, getMyOrders);
router.post("/:id/cancel", authMiddleware, cancelOrder);
router.get("/:id", authMiddleware, getOrderDetails);

router.get("/", authMiddleware, adminMiddleware, getAdminOrders);
router.get("/admin/:id", authMiddleware, adminMiddleware, getAdminOrderDetails);
router.patch("/:id/status", authMiddleware, adminMiddleware, updateOrderStatus);

export default router;
