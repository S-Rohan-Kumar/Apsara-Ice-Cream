import Offer from "../models/offer.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { APIResponse } from "../utils/api-response.js";
import { APIError } from "../utils/api-error.js";

const getactiveoffers = asyncHandler(async (req,res) => {
  const currentDate = new Date();
  const offers = await Offer.find({
    isActive: true,
    startsAt: { $lte: currentDate },
    expiresAt: { $gte: currentDate },
  }).populate("category", "name");
  if (!offers) throw new APIError(404, "Offers not found");
  return res
    .status(200)
    .json(new APIResponse(200, offers, "Active Offers fetched"));
});

//GET api/admin/offers/
const getAllOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find({});
  if (!offers) throw new APIError(404, "Offers not found");
  return res.status(200).json(new APIResponse(200, offers, "Offers fetched"));
});

const createoffer = asyncHandler(async () => {
  const {
    title,
    description,
    category,
    discountPercent,
    minOrderAmount,
    startsAt,
    expiresAt,
  } = req.body;

  if (!title || !discountPercent || !startsAt || !expiresAt) {
    throw new APIError(
      400,
      "title, discountPercent, startsAt, expiresAt are required",
    );
  }
  if (new Date(expiresAt) <= new Date(startsAt)) {
    throw new APIError(400, "expiresAt must be after startsAt");
  }
  if (discountPercent < 1 || discountPercent > 100) {
    throw new APIError(400, "discountPercent must be between 1 and 100");
  }

  const offer = await Offer.create({
    title,
    description,
    category: category || null,
    discountPercent,
    minOrderAmount: minOrderAmount || 0,
    startsAt: new Date(startsAt),
    expiresAt: new Date(expiresAt),
    createdBy: req.user._id,
  });

  return res.status(201).json(new APIResponse(201, offer, "Offer created"));
});

//PATCH /api/offers/:id
const updateoffer = asyncHandler(async () => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw new APIError(404, "Offer not found");

  const allowed = [
    "title",
    "description",
    "discountPercent",
    "minOrderAmount",
    "startsAt",
    "expiresAt",
    "isActive",
  ];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) offer[field] = req.body[field];
  });

  await offer.save();
  return res.status(200).json(new APIResponse(200, offer, "Offer updated"));
});

//DELETE /api/offers/:id
const deleteoffer = asyncHandler(async () => {
  const offer = await Offer.findByIdAndDelete(req.params.id);
  if (!offer) throw new APIError(404, "Offer not found");
  return res.status(200).json(new APIResponse(200, null, "Offer deleted"));
});

export { getactiveoffers, createoffer, updateoffer, deleteoffer , getAllOffers };
