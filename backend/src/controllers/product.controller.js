import { asyncHandler } from "../utils/async-handler.js";
import { APIResponse } from "../utils/api-response.js";
import { APIError } from "../utils/api-error.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Offer from "../models/offer.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {
    scheduleProductReEnable,
    cancelProductReEnable,
} from "../queues/stock.queue.js";
import { invalidate } from "../middleware/cache.middleware.js";

const ICECREAM_VARIANTS = ["small", "regular", "large", "binge", "shareIt"];
const ICECREAM_NO_SHARE_VARIANTS = ["small", "regular", "large", "binge"];

const getVariants = (category) => {
    if (category.productType !== "icecream") return ["regular"];
    return category.hasShareIt ? ICECREAM_VARIANTS : ICECREAM_NO_SHARE_VARIANTS;
};

// ─── Pricing helper ───────────────────────────────────────────────────────────
const resolvePrice = (product, category, activeOffers) => {
    if (!category || !category.basePrice) {
        return { basePrices: {}, resolvedPrices: {}, appliedOffer: null };
    }

    const variants = getVariants(category);

    const base = {};
    variants.forEach((v) => {
        base[v] = product.priceOverride?.[v] ?? category.basePrice[v] ?? 0;
    });

    const categoryIdStr = category._id
        ? category._id.toString()
        : category.toString();
    const offer = activeOffers.find(
        (o) =>
            !o.category ||
            (o.category._id
                ? o.category._id.toString()
                : o.category.toString()) === categoryIdStr,
    );

    if (!offer) {
        return { basePrices: base, resolvedPrices: base, appliedOffer: null };
    }

    const disc = offer.discountPercent / 100;
    const discounted = {};
    variants.forEach((v) => {
        discounted[v] = Math.round(base[v] * (1 - disc));
    });

    return {
        basePrices: base,
        resolvedPrices: discounted,
        appliedOffer: {
            _id: offer._id,
            title: offer.title,
            discountPercent: offer.discountPercent,
            minOrderAmount: offer.minOrderAmount || 0,
            category: offer.category,
            expiresAt: offer.expiresAt,
        },
    };
};

const isSnoozedActive = (from, until) => {
    if (!until) return false;
    const now = new Date();
    const u = new Date(until);
    const f = from ? new Date(from) : null;
    if (f && now < f) return false;
    return now <= u;
};

// ─── GET /api/products —
const getProducts = asyncHandler(async (req, res) => {
    const { category, zeroSugar } = req.query;

    const filter = { isActive: true, isAvailable: true };
    if (category) filter.category = category;
    if (zeroSugar) filter.isZeroSugar = zeroSugar === "true";

    const products = await Product.find(filter)
        .populate(
            "category",
            "name basePrice productType hasShareIt isZeroSugar",
        )
        .sort({ sortOrder: 1 });

    const now = new Date();
    const activeOffers = await Offer.find({
        isActive: true,
        startsAt: { $lte: now },
        expiresAt: { $gte: now },
    });

    const data = products.map((prod) => {
        const p = prod.toObject();
        const priceInfo = resolvePrice(prod, prod.category, activeOffers);
        p.basePrices = priceInfo.basePrices;
        p.resolvedPrices = priceInfo.resolvedPrices;
        p.appliedOffer = priceInfo.appliedOffer;
        p.availableVariants = getAvailableVariants(prod);
        return p;
    });

    return res.status(200).json(new APIResponse(200, data, "Products fetched"));
});

// ─── GET /api/products/all —
const getAllProducts = asyncHandler(async (req, res) => {
    const { category } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;

    const products = await Product.find(filter)
        .populate(
            "category",
            "name basePrice productType hasShareIt isZeroSugar",
        )
        .sort({ sortOrder: 1 });

    const now = new Date();
    const activeOffers = await Offer.find({
        isActive: true,
        startsAt: { $lte: now },
        expiresAt: { $gte: now },
    });

    const data = products.map((prod) => {
        const p = prod.toObject();
        const priceInfo = resolvePrice(prod, prod.category, activeOffers);
        p.basePrices = priceInfo.basePrices;
        p.resolvedPrices = priceInfo.resolvedPrices;
        p.appliedOffer = priceInfo.appliedOffer;
        p.availableVariants = getAvailableVariants(prod);
        return p;
    });

    return res.status(200).json(new APIResponse(200, data, "Products fetched"));
});

const getAvailableVariants = (product) => {
    if (product.category?.productType !== "icecream") {
        const snoozed = isSnoozedActive(
            product.snoozedFrom,
            product.snoozedUntil,
        );
        return !snoozed && product.isAvailable ? ["single"] : [];
    }
    const variants = getVariants(product.category);
    const available = {};
    variants.forEach((v) => {
        const snoozed = isSnoozedActive(
            product.variantSnoozedFrom?.[v],
            product.variantSnoozedUntil?.[v],
        );
        available[v] = snoozed
            ? false
            : (product.variantAvailability?.[v] ?? true);
    });
    return available;
};

// ─── GET /api/products/:id
const getProductDetails = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate(
        "category",
        "name basePrice productType hasShareIt isZeroSugar",
    );

    if (!product || !product.isActive)
        throw new APIError(404, "Product not found");

    const now = new Date();
    const activeOffers = await Offer.find({
        isActive: true,
        startsAt: { $lte: now },
        expiresAt: { $gte: now },
    });

    const data = product.toObject();
    const priceInfo = resolvePrice(product, product.category, activeOffers);
    data.basePrices = priceInfo.basePrices;
    data.resolvedPrices = priceInfo.resolvedPrices;
    data.appliedOffer = priceInfo.appliedOffer;
    data.availableVariants = getAvailableVariants(product);

    return res.status(200).json(new APIResponse(200, data, "Product fetched"));
});

// ─── POST /api/products
const createProduct = asyncHandler(async (req, res) => {
    const { name, category, isZeroSugar, sortOrder } = req.body;

    if (!name || !category)
        throw new APIError(400, "name and category are required");

    const cat = await Category.findById(category);
    if (!cat) throw new APIError(404, "Category not found");

    let priceOverride = {};
    if (req.body.priceOverride) {
        try {
            priceOverride =
                typeof req.body.priceOverride === "string"
                    ? JSON.parse(req.body.priceOverride)
                    : req.body.priceOverride;
        } catch {
            priceOverride = {};
        }
    }

    let imageUrl = "";
    if (req.file) {
        const uploaded = await uploadOnCloudinary(req.file.path);
        if (uploaded) imageUrl = uploaded.secure_url;
    }

    const variantAvailability = {
        small: true,
        regular: true,
        large: true,
        binge: true,
        shareIt: cat.hasShareIt ? true : false,
    };

    const product = await Product.create({
        name,
        category,
        imageUrl,
        isZeroSugar: isZeroSugar === "true" || isZeroSugar === true,
        priceOverride,
        variantAvailability,
        isAvailable: true,
        sortOrder: sortOrder || 0,
    });

    return res
        .status(201)
        .json(new APIResponse(201, product, "Product created"));
});

// ─── PATCH /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive)
        throw new APIError(404, "Product not found");

    const allowed = ["name", "category", "isZeroSugar", "sortOrder"];
    allowed.forEach((field) => {
        if (req.body[field] !== undefined) product[field] = req.body[field];
    });

    if (req.body.priceOverride) {
        try {
            product.priceOverride =
                typeof req.body.priceOverride === "string"
                    ? JSON.parse(req.body.priceOverride)
                    : req.body.priceOverride;
        } catch {}
    }

    if (req.file) {
        const uploaded = await uploadOnCloudinary(req.file.path);
        if (uploaded) product.imageUrl = uploaded.secure_url;
    }

    await product.save();
    return res
        .status(200)
        .json(new APIResponse(200, product, "Product updated"));
});

// ─── PATCH /api/products/:id/variant-availability
const updateVariantAvailability = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate(
        "category",
        "productType hasShareIt",
    );

    if (!product || !product.isActive)
        throw new APIError(404, "Product not found");

    if (product.category.productType !== "icecream") {
        throw new APIError(
            400,
            "Variant availability only applies to ice cream products",
        );
    }

    const variants = ["small", "regular", "large", "binge"];
    if (product.category.hasShareIt) variants.push("shareIt");

    variants.forEach((v) => {
        if (req.body[v] !== undefined) {
            product.variantAvailability[v] = Boolean(req.body[v]);
        }
    });

    product.isAvailable = variants.some((v) => product.variantAvailability[v]);

    await product.save();

    return res.status(200).json(
        new APIResponse(
            200,
            {
                variantAvailability: product.variantAvailability,
                isAvailable: product.isAvailable,
            },
            "Variant availability updated",
        ),
    );
});

//PATCH /api/products/:id/toggle-stock
const toggleStock = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate(
        "category",
        "productType",
    );

    if (!product) throw new APIError(404, "Product not found");

    if (product.category?.productType === "icecream") {
        throw new APIError(
            400,
            "Use variant-availability for ice cream products",
        );
    }

    product.isAvailable = !product.isAvailable;
    await product.save();

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                { isAvailable: product.isAvailable },
                "Stock toggled",
            ),
        );
});

// ─── DELETE /api/products/:id
const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new APIError(404, "Product not found");

    product.isActive = false;
    await product.save();

    return res
        .status(200)
        .json(new APIResponse(200, null, "Product removed from catalog"));
});

// ─── PATCH /api/products/:id/snooze ───────────────────────────────────────────
const snoozeProduct = asyncHandler(async (req, res) => {
    const { hours, variant, startsAt, expiresAt } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
        throw new APIError(404, "Product not found");
    }

    const durationHours = parseFloat(hours);
    const now = new Date();

    let snoozedFrom = startsAt ? new Date(startsAt) : now;
    let snoozedUntil = null;
    let delayMs = 0;

    if (expiresAt) {
        snoozedUntil = new Date(expiresAt);
        delayMs = snoozedUntil.getTime() - Date.now();
        if (delayMs <= 0)
            throw new APIError(400, "Expiry time must be in the future");
    } else if (durationHours > 0) {
        delayMs = durationHours * 60 * 60 * 1000;
        snoozedUntil = new Date(Date.now() + delayMs);
    }

    if (variant) {
        const validVariants = ["small", "regular", "large", "binge", "shareIt"];
        if (!validVariants.includes(variant)) {
            throw new APIError(400, "Invalid variant");
        }

        if (!product.variantAvailability) {
            product.variantAvailability = {
                small: true,
                regular: true,
                large: true,
                binge: true,
                shareIt: true,
            };
        }
        if (!product.variantSnoozedUntil) {
            product.variantSnoozedUntil = {};
        }
        if (!product.variantSnoozedFrom) {
            product.variantSnoozedFrom = {};
        }

        if (snoozedUntil) {
            product.variantSnoozedFrom[variant] = snoozedFrom;
            product.variantSnoozedUntil[variant] = snoozedUntil;
            if (snoozedFrom <= now) {
                product.variantAvailability[variant] = false;
            }
            product.isAvailable = Object.values(
                product.variantAvailability,
            ).some(Boolean);
            await product.save();

            await scheduleProductReEnable(product._id, delayMs, variant);
            await invalidate("products", "products_all");

            return res.status(200).json(
                new APIResponse(
                    200,
                    {
                        variant,
                        variantAvailability: product.variantAvailability,
                        variantSnoozedFrom: product.variantSnoozedFrom,
                        variantSnoozedUntil: product.variantSnoozedUntil,
                        isAvailable: product.isAvailable,
                    },
                    `${variant} snoozed until ${snoozedUntil.toLocaleString()}`,
                ),
            );
        } else if (durationHours === -1 || hours === "indefinite") {
            product.variantAvailability[variant] = false;
            product.variantSnoozedUntil[variant] = null;
            product.variantSnoozedFrom[variant] = null;
            product.isAvailable = Object.values(
                product.variantAvailability,
            ).some(Boolean);
            await product.save();

            await cancelProductReEnable(product._id, variant);
            await invalidate("products", "products_all");

            return res.status(200).json(
                new APIResponse(
                    200,
                    {
                        variant,
                        variantAvailability: product.variantAvailability,
                        variantSnoozedFrom: product.variantSnoozedFrom,
                        variantSnoozedUntil: product.variantSnoozedUntil,
                        isAvailable: product.isAvailable,
                    },
                    `${variant} turned off until marked on`,
                ),
            );
        } else {
            product.variantAvailability[variant] = true;
            product.variantSnoozedUntil[variant] = null;
            product.variantSnoozedFrom[variant] = null;
            product.isAvailable = true;
            await product.save();

            await cancelProductReEnable(product._id, variant);
            await invalidate("products", "products_all");

            return res.status(200).json(
                new APIResponse(
                    200,
                    {
                        variant,
                        variantAvailability: product.variantAvailability,
                        variantSnoozedFrom: product.variantSnoozedFrom,
                        variantSnoozedUntil: product.variantSnoozedUntil,
                        isAvailable: product.isAvailable,
                    },
                    `${variant} re-enabled and active`,
                ),
            );
        }
    }

    if (snoozedUntil) {
        product.snoozedFrom = snoozedFrom;
        product.snoozedUntil = snoozedUntil;
        if (snoozedFrom <= now) {
            product.isAvailable = false;
        }
        await product.save();

        await scheduleProductReEnable(product._id, delayMs);
        await invalidate("products", "products_all");

        return res.status(200).json(
            new APIResponse(
                200,
                {
                    isAvailable: product.isAvailable,
                    snoozedFrom: product.snoozedFrom,
                    snoozedUntil: product.snoozedUntil,
                },
                `Product snoozed until ${snoozedUntil.toLocaleString()}`,
            ),
        );
    } else if (durationHours === -1 || hours === "indefinite") {
        product.isAvailable = false;
        product.snoozedFrom = null;
        product.snoozedUntil = null;
        await product.save();

        await cancelProductReEnable(product._id);
        await invalidate("products", "products_all");

        return res.status(200).json(
            new APIResponse(
                200,
                {
                    isAvailable: false,
                    snoozedFrom: null,
                    snoozedUntil: null,
                },
                "Product turned off until marked on",
            ),
        );
    } else {
        product.isAvailable = true;
        product.snoozedFrom = null;
        product.snoozedUntil = null;
        if (product.variantAvailability) {
            product.variantAvailability.small = true;
            product.variantAvailability.regular = true;
            product.variantAvailability.large = true;
            product.variantAvailability.binge = true;
            if (product.category?.hasShareIt)
                product.variantAvailability.shareIt = true;
        }
        if (product.variantSnoozedUntil) {
            product.variantSnoozedUntil.small = null;
            product.variantSnoozedUntil.regular = null;
            product.variantSnoozedUntil.large = null;
            product.variantSnoozedUntil.binge = null;
            product.variantSnoozedUntil.shareIt = null;
        }
        if (product.variantSnoozedFrom) {
            product.variantSnoozedFrom.small = null;
            product.variantSnoozedFrom.regular = null;
            product.variantSnoozedFrom.large = null;
            product.variantSnoozedFrom.binge = null;
            product.variantSnoozedFrom.shareIt = null;
        }
        await product.save();

        await cancelProductReEnable(product._id);
        await invalidate("products", "products_all");

        return res.status(200).json(
            new APIResponse(
                200,
                {
                    isAvailable: product.isAvailable,
                    snoozedFrom: null,
                    snoozedUntil: null,
                },
                "Product re-enabled and now active",
            ),
        );
    }
});

export {
    getProducts,
    getAllProducts,
    getProductDetails,
    createProduct,
    updateProduct,
    updateVariantAvailability,
    toggleStock,
    deleteProduct,
    snoozeProduct,
};
