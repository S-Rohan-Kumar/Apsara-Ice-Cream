import { Queue } from "bullmq";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import { emitNewOrder } from "../socket/socket.js";
import { sendFCM } from "../utils/send-fcm.js";

const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined,
};

let orderGraceQueue = null;
try {
  orderGraceQueue = new Queue("order-grace-queue", {
    connection: redisConnection,
  });
  orderGraceQueue.on("error", (err) => {
    // Suppress unhandled redis connection spam in dev
  });
} catch (e) {
  console.warn("[BullMQ] Grace queue running with in-memory fallback:", e.message);
}

// In-memory timer fallback map for high resilience
const inMemoryGraceTimers = new Map();

/**
 * Execute the transition releasing an order to kitchen terminals after the grace period expires.
 */
export const releaseOrderToKitchen = async (orderId) => {
  try {
    const idStr = orderId.toString();
    inMemoryGraceTimers.delete(idStr);

    const order = await Order.findById(idStr).populate('customer', 'name phone');
    if (!order) return;

    // Only release if the order was not cancelled during the 60s window and not yet released
    if (order.status !== 'placed' || order.isGraceReleased) {
      return;
    }

    order.isGraceReleased = true;
    await order.save();

    console.log(`[Grace Period Machine] Order ${order.orderNumber} (ID: ${order._id}) 60s grace ended. Releasing to kitchen! 🔔`);

    // Emit socket event to admin dashboard (kitchen chime rings!)
    const populated = order.toObject ? order.toObject() : { ...order };
    emitNewOrder(populated);

    // Send push notification to Admin & Owner
    const adminUsers = await User.find({ role: { $in: ['admin', 'owner'] } })
      .select('fcmToken pushToken')
      .lean();

    const paymentLabel = (order.payment?.method || 'COD').toUpperCase();
    for (const adminUser of adminUsers) {
      const tokens = [adminUser.fcmToken, adminUser.pushToken].filter(Boolean);
      for (const token of new Set(tokens)) {
        sendFCM(
          token,
          `🔔 Prepare Order ${order.orderNumber}`,
          `${paymentLabel} order ready for packing (${order.customer?.phone || 'Mandya Hub'})`,
          { type: 'new_order', orderId: order._id.toString(), orderNumber: order.orderNumber }
        ).catch(() => {});
      }
    }
  } catch (err) {
    console.error(`[Grace Period Machine] Failed to release order ${orderId}:`, err.message);
  }
};

/**
 * Schedule 60-second delayed kitchen release for a newly placed order.
 */
export const scheduleKitchenRelease = async (orderId, delayMs = 60000) => {
  const idStr = orderId.toString();
  const jobId = `grace_${idStr}`;

  // 1. BullMQ delayed job
  if (orderGraceQueue) {
    try {
      const existingJob = await orderGraceQueue.getJob(jobId);
      if (existingJob) await existingJob.remove();

      await orderGraceQueue.add(
        "release-to-kitchen",
        { orderId: idStr },
        {
          jobId,
          delay: delayMs,
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
    } catch (bullErr) {
      // In-memory fallback will handle it
    }
  }

  // 2. Resilient In-Memory Fallback
  if (inMemoryGraceTimers.has(idStr)) {
    clearTimeout(inMemoryGraceTimers.get(idStr));
  }
  const timer = setTimeout(() => {
    releaseOrderToKitchen(idStr);
  }, delayMs);
  inMemoryGraceTimers.set(idStr, timer);
};

/**
 * Cancel the delayed release job when customer cancels order within 60s.
 */
export const cancelOrderGrace = async (orderId) => {
  const idStr = orderId.toString();
  const jobId = `grace_${idStr}`;

  if (inMemoryGraceTimers.has(idStr)) {
    clearTimeout(inMemoryGraceTimers.get(idStr));
    inMemoryGraceTimers.delete(idStr);
  }

  if (orderGraceQueue) {
    try {
      const existingJob = await orderGraceQueue.getJob(jobId);
      if (existingJob) await existingJob.remove();
    } catch (e) {}
  }
};
