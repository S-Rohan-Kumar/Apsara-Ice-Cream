import { Queue } from "bullmq";

const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined,
};

export const stockQueue = new Queue("stock-queue", {
  connection: redisConnection,
});

export const scheduleProductReEnable = async (productId, delayMs, variant = null) => {
  const jobId = variant
    ? `reenable_${productId.toString()}_${variant}`
    : `reenable_${productId.toString()}`;

  const existingJob = await stockQueue.getJob(jobId);
  if (existingJob) {
    await existingJob.remove();
  } 

  await stockQueue.add(
    "re-enable-product",
    { productId: productId.toString(), variant: variant || null },
    {
      jobId,
      delay: delayMs,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
};

export const cancelProductReEnable = async (productId, variant = null) => {
  const jobId = variant
    ? `reenable_${productId.toString()}_${variant}`
    : `reenable_${productId.toString()}`;
  const existingJob = await stockQueue.getJob(jobId);
  if (existingJob) {
    await existingJob.remove();
  }
};