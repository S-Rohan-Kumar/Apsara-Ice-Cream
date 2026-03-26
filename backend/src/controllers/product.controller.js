import { asyncHandler } from "../utils/async-handler.js";
import { APIResponse } from "../utils/api-response.js";
import { APIError } from "../utils/api-error.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Offer from "../models/offer.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Pricing helper
const resolvePrice = (priceOverride, basePrice, activeOffers, categoryId) => {
  if (!basePrice) return {};

  const base = {
    small  : priceOverride?.small   ?? basePrice.small,
    regular: priceOverride?.regular ?? basePrice.regular,
    large  : priceOverride?.large   ?? basePrice.large,
    binge  : priceOverride?.binge   ?? basePrice.binge,
  };

  const offer = activeOffers.find((o) => {
    if (!o.category) return true; 
    if (!categoryId) return false; 

    return o.category.toString() === categoryId.toString();
  });

  if (!offer) return base;

  const disc = offer.discountPercent / 100;

  return {
    small  : Math.round(base.small   * (1 - disc)),
    regular: Math.round(base.regular * (1 - disc)),
    large  : Math.round(base.large   * (1 - disc)),
    binge  : Math.round(base.binge   * (1 - disc)),
  };
};

// GET /api/products
const getProducts = asyncHandler(async (req, res) => {
  const { category, zeroSugar } = req.query;

  const filter = { isActive: true, isAvailable: true };
  if (category) filter.category = category;
  if (zeroSugar) filter.isZeroSugar = zeroSugar === "true";

  const products = await Product.find(filter)
    .populate("category", "name basePrice")
    .sort({ sortOrder: 1 });

  const now = new Date(); 
  const activeOffers = await Offer.find({
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gte: now },
  });

  const data = products.map((prod) => {
    const p = prod.toObject();
    p.resolvedPrices = resolvePrice(p.priceOverride, p.category?.basePrice, activeOffers, p.category?._id);
    return p;
  });

  return res.status(200).json(new APIResponse(200, data, "Products fetched"));
});

//GET /api/products/all
const getAllProducts = asyncHandler(async (req, res) => {
  const { category, zeroSugar } = req.query;
  const filter ={}
  if (category) filter.category = category;
  if (zeroSugar) filter.isZeroSugar = zeroSugar === "true";
  const products = await Product.find(filter).populate("category", "name basePrice")
    .sort({ sortOrder: 1 });

  const now = new Date(); 
  const activeOffers = await Offer.find({
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gte: now },
  });
  const data = products.map((prod) => {
    const p = prod.toObject();
    p.resolvedPrices = resolvePrice(p.priceOverride, p.category?.basePrice, activeOffers, p.category?._id);
    return p;
  });
  return res
    .status(200)
    .json(new APIResponse(200, data, "Products fetched"));
});

// GET /api/products/:id
const getProductDetails = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate(
    "category",
    "name basePrice",
  );

  if (!product || !product.isActive) {
    throw new APIError(404, "Product not found");
  }

  const now = new Date(); // ✅ fixed
  const activeOffers = await Offer.find({
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gte: now },
  });

  const data = product.toObject();
  data.resolvedPrices = resolvePrice(product, product.category, activeOffers);

  return res.status(200).json(new APIResponse(200, data, "Product fetched"));
});

// POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const { name, category, isZeroSugar, sortOrder } = req.body;

  if (!name || !category) {
    throw new APIError(400, "name and category are required");
  }

  const cat = await Category.findById(category);
  if (!cat) throw new APIError(404, "Category not found");

  // Parse priceOverride — comes as string from form-data
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

  const product = await Product.create({
    name,
    category,
    imageUrl,
    isZeroSugar: isZeroSugar === "true" || isZeroSugar === true,
    priceOverride,
    sortOrder: sortOrder || 0,
  });

  return res.status(201).json(new APIResponse(201, product, "Product created"));
});

// PATCH /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product || !product.isActive) {
    throw new APIError(404, "Product not found");
  }

  const allowed = ["name", "category", "isZeroSugar", "sortOrder"];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });

  // Parse priceOverride separately
  if (req.body.priceOverride) {
    try {
      product.priceOverride =
        typeof req.body.priceOverride === "string"
          ? JSON.parse(req.body.priceOverride)
          : req.body.priceOverride;
    } catch {
      // keep existing priceOverride if parse fails
    }
  }

  if (req.file) {
    const uploaded = await uploadOnCloudinary(req.file.path);
    if (uploaded) product.imageUrl = uploaded.secure_url;
  }

  await product.save();
  return res.status(200).json(new APIResponse(200, product, "Product updated"));
});

// PATCH /api/products/:id/toggle-stock
const toggleStock = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new APIError(404, "Product not found");

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

// DELETE /api/products/:id — soft delete
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new APIError(404, "Product not found");

  product.isActive = false; // ✅ soft delete — preserves order history
  await product.save();

  return res
    .status(200)
    .json(new APIResponse(200, null, "Product removed from catalog"));
});

export {
  getProducts,
  getProductDetails,
  createProduct,
  updateProduct,
  toggleStock,
  deleteProduct,
  getAllProducts
};
