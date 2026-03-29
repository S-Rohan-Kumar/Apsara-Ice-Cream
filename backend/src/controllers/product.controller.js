import { asyncHandler }   from '../utils/async-handler.js';
import { APIResponse }    from '../utils/api-response.js';
import { APIError }       from '../utils/api-error.js';
import Product            from '../models/product.model.js';
import Category           from '../models/category.model.js';
import Offer              from '../models/offer.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const ICECREAM_VARIANTS      = ['small', 'regular', 'large', 'binge', 'shareIt'];
const ICECREAM_NO_SHARE_VARIANTS = ['small', 'regular', 'large', 'binge'];

const getVariants = (category) => {
  if (category.productType !== 'icecream') return ['regular'];
  return category.hasShareIt ? ICECREAM_VARIANTS : ICECREAM_NO_SHARE_VARIANTS;
};

// ─── Pricing helper ───────────────────────────────────────────────────────────
const resolvePrice = (product, category, activeOffers) => {
  if (!category || !category.basePrice) return {};

  const variants = getVariants(category);

  const base = {};
  variants.forEach(v => {
    base[v] = product.priceOverride?.[v] ?? category.basePrice[v] ?? 0;
  });

  const offer = activeOffers.find(o =>
    !o.category ||
    o.category.toString() === category._id.toString()
  );

  if (!offer) return base;

  const disc = offer.discountPercent / 100;
  const discounted = {};
  variants.forEach(v => {
    discounted[v] = Math.round(base[v] * (1 - disc));
  });
  return discounted;
};

// ─── GET /api/products — 
const getProducts = asyncHandler(async (req, res) => {
  const { category, zeroSugar } = req.query;

  const filter = { isActive: true, isAvailable: true };
  if (category)  filter.category    = category;
  if (zeroSugar) filter.isZeroSugar = zeroSugar === 'true';

  const products = await Product.find(filter)
    .populate('category', 'name basePrice productType hasShareIt isZeroSugar')
    .sort({ sortOrder: 1 });

  const now          = new Date();
  const activeOffers = await Offer.find({
    isActive : true,
    startsAt : { $lte: now },
    expiresAt: { $gte: now },
  });

  const data = products.map(prod => {
    const p               = prod.toObject();
    p.resolvedPrices      = resolvePrice(prod, prod.category, activeOffers);
    p.availableVariants   = getAvailableVariants(prod);
    return p;
  });

  return res.status(200).json(new APIResponse(200, data, 'Products fetched'));
});

// ─── GET /api/products/all — 
const getAllProducts = asyncHandler(async (req, res) => {
  const { category } = req.query;

  const filter = { isActive: true }; 
  if (category) filter.category = category;

  const products = await Product.find(filter)
    .populate('category', 'name basePrice productType hasShareIt isZeroSugar')
    .sort({ sortOrder: 1 });

  const now          = new Date();
  const activeOffers = await Offer.find({
    isActive : true,
    startsAt : { $lte: now },
    expiresAt: { $gte: now },
  });

  const data = products.map(prod => {
    const p             = prod.toObject();
    p.resolvedPrices    = resolvePrice(prod, prod.category, activeOffers);
    p.availableVariants = getAvailableVariants(prod);
    return p;
  });

  return res.status(200).json(new APIResponse(200, data, 'Products fetched'));
});

const getAvailableVariants = (product) => {
  if (product.category?.productType !== 'icecream') {
    return product.isAvailable ? ['single'] : [];
  }
  const variants  = getVariants(product.category);
  const available = {};
  variants.forEach(v => {
    available[v] = product.variantAvailability?.[v] ?? true;
  });
  return available;
};

// ─── GET /api/products/:id
const getProductDetails = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name basePrice productType hasShareIt isZeroSugar');

  if (!product || !product.isActive) throw new APIError(404, 'Product not found');

  const now          = new Date();
  const activeOffers = await Offer.find({
    isActive : true,
    startsAt : { $lte: now },
    expiresAt: { $gte: now },
  });

  const data             = product.toObject();
  data.resolvedPrices    = resolvePrice(product, product.category, activeOffers);
  data.availableVariants = getAvailableVariants(product);

  return res.status(200).json(new APIResponse(200, data, 'Product fetched'));
});

// ─── POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const { name, category, isZeroSugar, sortOrder } = req.body;

  if (!name || !category) throw new APIError(400, 'name and category are required');

  const cat = await Category.findById(category);
  if (!cat) throw new APIError(404, 'Category not found');

  let priceOverride = {};
  if (req.body.priceOverride) {
    try {
      priceOverride = typeof req.body.priceOverride === 'string'
        ? JSON.parse(req.body.priceOverride)
        : req.body.priceOverride;
    } catch { priceOverride = {}; }
  }

  let imageUrl = '';
  if (req.file) {
    const uploaded = await uploadOnCloudinary(req.file.path);
    if (uploaded) imageUrl = uploaded.secure_url;
  }

  const variantAvailability = {
    small  : true,
    regular: true,
    large  : true,
    binge  : true,
    shareIt: cat.hasShareIt ? true : false,
  };

  const product = await Product.create({
    name,
    category,
    imageUrl,
    isZeroSugar      : isZeroSugar === 'true' || isZeroSugar === true,
    priceOverride,
    variantAvailability,
    isAvailable      : true,
    sortOrder        : sortOrder || 0,
  });

  return res.status(201).json(new APIResponse(201, product, 'Product created'));
});

// ─── PATCH /api/products/:id 
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product || !product.isActive) throw new APIError(404, 'Product not found');

  const allowed = ['name', 'category', 'isZeroSugar', 'sortOrder'];
  allowed.forEach(field => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });

  if (req.body.priceOverride) {
    try {
      product.priceOverride = typeof req.body.priceOverride === 'string'
        ? JSON.parse(req.body.priceOverride)
        : req.body.priceOverride;
    } catch {}
  }

  if (req.file) {
    const uploaded = await uploadOnCloudinary(req.file.path);
    if (uploaded) product.imageUrl = uploaded.secure_url;
  }

  await product.save();
  return res.status(200).json(new APIResponse(200, product, 'Product updated'));
});

// ─── PATCH /api/products/:id/variant-availability
const updateVariantAvailability = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'productType hasShareIt');

  if (!product || !product.isActive) throw new APIError(404, 'Product not found');

  if (product.category.productType !== 'icecream') {
    throw new APIError(400, 'Variant availability only applies to ice cream products');
  }

  const variants = ['small', 'regular', 'large', 'binge'];
  if (product.category.hasShareIt) variants.push('shareIt');

  variants.forEach(v => {
    if (req.body[v] !== undefined) {
      product.variantAvailability[v] = Boolean(req.body[v]);
    }
  });

  product.isAvailable = variants.some(v => product.variantAvailability[v]);

  await product.save();

  return res.status(200).json(
    new APIResponse(200, {
      variantAvailability: product.variantAvailability,
      isAvailable        : product.isAvailable,
    }, 'Variant availability updated')
  );
});

//PATCH /api/products/:id/toggle-stock 
const toggleStock = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'productType');

  if (!product) throw new APIError(404, 'Product not found');

  if (product.category?.productType === 'icecream') {
    throw new APIError(400, 'Use variant-availability for ice cream products');
  }

  product.isAvailable = !product.isAvailable;
  await product.save();

  return res.status(200).json(
    new APIResponse(200, { isAvailable: product.isAvailable }, 'Stock toggled')
  );
});

// ─── DELETE /api/products/:id
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new APIError(404, 'Product not found');

  product.isActive = false;
  await product.save();

  return res.status(200).json(new APIResponse(200, null, 'Product removed from catalog'));
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
};