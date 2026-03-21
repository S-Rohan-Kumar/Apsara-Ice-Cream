import { APIError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { APIResponse } from "../utils/api-response.js";
import Category from "../models/category.model.js";

let categoryCache = null;
let cacheTime = null;
const CACHE_TTL = 10 * 60 * 1000;

const clearCache = () => {
  categoryCache = null;
  cacheTime = null;
};

//GET /api/categories
const getCategories = asyncHandler(async (req, res) => {
  if (categoryCache && Date.now() - cacheTime < CACHE_TTL) {
    return res
      .status(200)
      .json(new APIResponse(200, categoryCache, "Categories fetched"));
  }

  const categories = await Category.find({ isActive: true }).sort({
    sortOrder: 1,
  });
  if (!categories) throw new APIError(404, "Categories not found");
  categoryCache = categories;
  cacheTime = Date.now();

  return res
    .status(200)
    .json(new APIResponse(200, categories, "Categories fetched"));
});

//POST /api/admin/categories
const createCategory = asyncHandler(async (req, res) => {
  const { name, imageUrl, basePrice, sortOrder } = req.body;
  if (
    !name ||
    !basePrice?.small ||
    !basePrice?.regular ||
    !basePrice?.large ||
    !basePrice?.binge
  )
    throw new APIError(400, "Invalid request body");

  const exsistingCategory = await Category.findOne({ name });
  if (exsistingCategory) throw new APIError(400, "Category already exists");

  const category = await Category.create({
    name,
    imageUrl,
    basePrice,
    sortOrder,
  });

  clearCache();

  return res
    .status(201)
    .json(new APIResponse(201, category, "Category created"));
});

//PATCH /api/admin/category/:id
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new APIError(404, "Category not found");

  const allowed = ["name", "imageUrl", "basePrice", "sortOrder"];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) category[field] = req.body[field];
  });
  await category.save();

  clearCache();

  const updatedCategory = await Category.findById(req.params.id);

  return res
    .status(200)
    .json(new APIResponse(200, updatedCategory, "Category updated"));
});

export { getCategories, createCategory, updateCategory };
