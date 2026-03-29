import { APIError }      from "../utils/api-error.js";
import { asyncHandler }  from "../utils/async-handler.js";
import { APIResponse }   from "../utils/api-response.js";
import Category          from "../models/category.model.js";
import { invalidate }    from "../middleware/cache.middleware.js";


// GET /api/categories
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category
    .find({ isActive: true })
    .select("name imageUrl basePrice sortOrder isActive")
    .sort({ sortOrder: 1 })
    .lean();  

  return res.status(200).json(new APIResponse(200, categories, "Categories fetched"));
});

// POST /api/categories
const createCategory = asyncHandler(async (req, res) => {
  const { name, imageUrl, basePrice, sortOrder } = req.body;

  if (!name || !basePrice?.small || !basePrice?.regular ||
      !basePrice?.large || !basePrice?.binge) {
    throw new APIError(400, "name and all basePrice fields are required");
  }

  const existing = await Category.findOne({ name }).lean();
  if (existing) throw new APIError(400, "Category already exists");

  const category = await Category.create({ name, imageUrl, basePrice, sortOrder });

  await invalidate("categories" ,"products", "products_all");

  return res.status(201).json(new APIResponse(201, category, "Category created"));
});

// PATCH /api/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
  const allowed = ["name", "imageUrl", "basePrice", "sortOrder", "isActive"];

  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (!Object.keys(updates).length) {
    throw new APIError(400, "No valid fields to update");
  }

  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();

  if (!category) throw new APIError(404, "Category not found");

  await invalidate("categories" ,"products", "products_all");

  return res.status(200).json(new APIResponse(200, category, "Category updated"));
});

export { getCategories, createCategory, updateCategory };