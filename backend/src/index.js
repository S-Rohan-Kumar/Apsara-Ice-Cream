import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env") });

const { server } = await import("./app.js");
const { default: connectDB } = await import("./db/index.js");
const { initStockWorker } = await import("./queues/stock.worker.js");
const { initOrderGraceWorker } = await import("./queues/orderGrace.worker.js");
const { syncMissingProductStock } = await import("./services/inventory.service.js");
const { default: Product } = await import("./models/product.model.js");
const { default: Order } = await import("./models/order.model.js");
const { releaseOrderToKitchen, scheduleKitchenRelease } = await import("./queues/orderGrace.queue.js");

const PORT = process.env.PORT || 8000;

connectDB()
    .then(async () => {
        // Initialize BullMQ background workers
        initStockWorker();
        initOrderGraceWorker();

        try {
            // 1. Initialize inventory stock tracking for any legacy products
            await syncMissingProductStock();

            // 2. Restore expired snoozed products
            const now = new Date();
            const expiredCount = await Product.updateMany(
                { isAvailable: false, snoozedUntil: { $lte: now } },
                { $set: { isAvailable: true, snoozedUntil: null } },
            );
            if (expiredCount.modifiedCount > 0) {
                console.log(
                    `[Startup Sweep] Restored ${expiredCount.modifiedCount} expired snoozed products to active.`,
                );
            }

            const variants = ["small", "regular", "large", "binge", "shareIt"];
            const productsWithSnoozedVariants = await Product.find({
                $or: variants.map((v) => ({ [`variantSnoozedUntil.${v}`]: { $lte: now } })),
            });

            for (const p of productsWithSnoozedVariants) {
                let modified = false;
                for (const v of variants) {
                    if (p.variantSnoozedUntil?.[v] && new Date(p.variantSnoozedUntil[v]) <= now) {
                        if (!p.variantAvailability) p.variantAvailability = {};
                        p.variantAvailability[v] = true;
                        p.variantSnoozedUntil[v] = null;
                        modified = true;
                    }
                }
                if (modified) {
                    p.isAvailable = Object.values(p.variantAvailability || {}).some(Boolean);
                    await p.save();
                }
            }

            // 3. Resume any orders in grace period across server restarts
            const pendingGraceOrders = await Order.find({
                status: 'placed',
                isGraceReleased: false,
                gracePeriodEndsAt: { $ne: null },
            });
            for (const pOrder of pendingGraceOrders) {
                const remainingMs = new Date(pOrder.gracePeriodEndsAt).getTime() - Date.now();
                if (remainingMs <= 0) {
                    await releaseOrderToKitchen(pOrder._id);
                } else {
                    await scheduleKitchenRelease(pOrder._id, remainingMs);
                }
            }
        } catch (e) {
            console.error("[Startup Sweep] Failed:", e.message);
        }

        server.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.log("Failed to connect to MongoDB", error);
    });
