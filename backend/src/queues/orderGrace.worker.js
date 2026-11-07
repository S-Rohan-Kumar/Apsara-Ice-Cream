import { Worker } from "bullmq";
import { releaseOrderToKitchen } from "./orderGrace.queue.js";

const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined,
};

export const initOrderGraceWorker = () => {
  try {
    const worker = new Worker(
      "order-grace-queue",
      async (job) => {
        if (job.name === "release-to-kitchen") {
          const { orderId } = job.data;
          await releaseOrderToKitchen(orderId);
        }
      },
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );

    worker.on("failed", (job, err) => {
      console.warn(`[BullMQ Order Grace Worker] Job ${job?.id} failed:`, err.message);
    });

    worker.on("error", (err) => {
      // In dev without redis, avoid unhandled rejections
    });

    return worker;
  } catch (err) {
    console.warn("[BullMQ Order Grace Worker] Redis worker init deferred:", err.message);
    return null;
  }
};
