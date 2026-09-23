import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env") });

const { server } = await import("./app.js");
const { default: connectDB } = await import("./db/index.js");
const { initStockWorker } = await import("./queues/stock.worker.js");
const { default: Product } = await import("./models/product.model.js");

const PORT = process.env.PORT || 8000;

connectDB()
    .then(async () => {
        initStockWorker();

        try {
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
