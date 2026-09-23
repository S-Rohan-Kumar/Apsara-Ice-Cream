import { Worker } from "bullmq";
import Product from "../models/product.model.js";
import { invalidate } from "../middleware/cache.middleware.js";

const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined,
};

export const initStockWorker = () => {
  const worker = new Worker(
    "stock-queue",
    async (job) => {
      if (job.name === "re-enable-product") {
        const { productId, variant } = job.data;

        const product = await Product.findById(productId);
        if (!product) return;

        if (variant) {
          if (product.variantAvailability) {
            product.variantAvailability[variant] = true;
          }
          if (product.variantSnoozedUntil) {
            product.variantSnoozedUntil[variant] = null;
          }
          product.isAvailable = Object.values(product.variantAvailability || {}).some(Boolean);
        } else {
          product.isAvailable = true;
          product.snoozedUntil = null;

          if (product.variantAvailability) {
            product.variantAvailability.small = true;
            product.variantAvailability.regular = true;
            product.variantAvailability.large = true;
            product.variantAvailability.binge = true;
            if (product.category?.hasShareIt) {
              product.variantAvailability.shareIt = true;
            }
          }
          if (product.variantSnoozedUntil) {
            product.variantSnoozedUntil.small = null;
            product.variantSnoozedUntil.regular = null;
            product.variantSnoozedUntil.large = null;
            product.variantSnoozedUntil.binge = null;
            product.variantSnoozedUntil.shareIt = null;
          }
        }

        await product.save();
        await invalidate("products", "products_all");
      }
    },
    { connection: redisConnection }
  );

  worker.on("failed", (job, err) => {
    console.error(`[BullMQ Worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
};