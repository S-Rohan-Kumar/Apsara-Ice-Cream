import Offer from '../models/offer.model.js';
import User from '../models/user.model.js';
import Broadcast from '../models/broadcast.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { APIResponse } from '../utils/api-response.js';
import { APIError } from '../utils/api-error.js';
import { emitOffersUpdated, emitBroadcast } from '../socket/socket.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { sendExpoPush, sendFCMPush } from '../utils/send-push.js';

// GET /api/offers/active
const getActiveOffers = asyncHandler(async (req, res) => {
  const now    = new Date();
  const offers = await Offer.find({
    isActive : true,
    startsAt : { $lte: now },
    expiresAt: { $gte: now },
  }).populate('category', 'name');

  return res.status(200).json(
    new APIResponse(200, offers, 'Active offers fetched')
  );
});

// GET /api/admin/offers
const getAllOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find({}).populate('category', 'name').sort({ createdAt: -1 });
  return res.status(200).json(new APIResponse(200, offers, 'Offers fetched'));
});

// POST /api/admin/offers
const createOffer = asyncHandler(async (req, res) => { 
  const {
    title, description, category,
    discountPercent, minOrderAmount, minQuantity,
    startsAt, expiresAt,
  } = req.body;

  if (!title || !discountPercent || !startsAt || !expiresAt) {
    throw new APIError(400, 'title, discountPercent, startsAt, expiresAt are required');
  }
  if (new Date(expiresAt) <= new Date(startsAt)) {
    throw new APIError(400, 'expiresAt must be after startsAt');
  }
  if (discountPercent < 1 || discountPercent > 100) {
    throw new APIError(400, 'discountPercent must be between 1 and 100');
  }

  let imageUrl = req.body.imageUrl || '';
  if (req.file) {
    const uploaded = await uploadOnCloudinary(req.file.path);
    if (uploaded) imageUrl = uploaded.secure_url;
  }

  const offer = await Offer.create({
    title: title.trim(),
    description: description ? description.trim() : '',
    category      : category || null,
    discountPercent: Number(discountPercent),
    minOrderAmount : Number(minOrderAmount) || 0,
    minQuantity    : Number(minQuantity) > 0 ? Number(minQuantity) : 1,
    imageUrl,
    startsAt       : new Date(startsAt),
    expiresAt      : new Date(expiresAt),
    createdBy      : req.user._id,
  });

  emitOffersUpdated({ action: 'created', offer });

  // Optional Rich Push Notification to customers with offer image banner
  const shouldSendPush = req.body.sendPush === 'true' || req.body.sendPush === true;
  if (shouldSendPush) {
    try {
      const pushTitle = `🎉 Special Offer: ${offer.title} (${offer.discountPercent}% OFF)`;
      const pushBody = offer.description || `Get ${offer.discountPercent}% OFF! Limited time store offer.`;

      const broadcast = await Broadcast.create({
        title: pushTitle,
        body: pushBody,
        type: 'promotional',
        imageUrl: offer.imageUrl || '',
        sentBy: req.user?._id || null,
      });

      emitBroadcast({
        _id: broadcast._id,
        title: broadcast.title,
        body: broadcast.body,
        type: broadcast.type,
        imageUrl: broadcast.imageUrl,
        createdAt: broadcast.createdAt,
        offerId: offer._id.toString(),
      });

      const users = await User.find({
        $or: [{ pushToken: { $ne: null } }, { fcmToken: { $ne: null } }],
      }).select('pushToken fcmToken').lean();

      const expoMessages = [];
      const fcmTokens = [];

      users.forEach((u) => {
        const token = u.pushToken || u.fcmToken;
        if (!token) return;
        if (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken')) {
          expoMessages.push({
            to: token,
            sound: 'default',
            title: pushTitle,
            body: pushBody,
            data: {
              broadcastId: broadcast._id.toString(),
              type: 'promotional',
              imageUrl: offer.imageUrl || '',
              image: offer.imageUrl || '',
              offerId: offer._id.toString(),
            },
          });
        } else {
          fcmTokens.push(token);
        }
      });

      if (expoMessages.length > 0) {
        sendExpoPush(expoMessages).catch(() => {});
      }
      if (fcmTokens.length > 0) {
        sendFCMPush(fcmTokens, pushTitle, pushBody, { offerId: offer._id.toString() }, offer.imageUrl).catch(() => {});
      }
    } catch (pushErr) {
      console.warn('[Offer push notification error]:', pushErr.message);
    }
  }

  return res.status(201).json(new APIResponse(201, offer, 'Offer created'));
});

// PATCH /api/admin/offers/:id
const updateOffer = asyncHandler(async (req, res) => { 
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw new APIError(404, 'Offer not found');

  if (req.file) {
    const uploaded = await uploadOnCloudinary(req.file.path);
    if (uploaded) offer.imageUrl = uploaded.secure_url;
  }

  const allowed = [
    'title', 'description', 'discountPercent',
    'minOrderAmount', 'minQuantity', 'startsAt', 'expiresAt', 'isActive', 'imageUrl',
  ];
  allowed.forEach(field => {
    if (req.body[field] !== undefined) offer[field] = req.body[field];
  });

  await offer.save();
  emitOffersUpdated({ action: 'updated', offer });
  return res.status(200).json(new APIResponse(200, offer, 'Offer updated'));
});

// DELETE /api/admin/offers/:id
const deleteOffer = asyncHandler(async (req, res) => {  
  const offer = await Offer.findByIdAndDelete(req.params.id);
  if (!offer) throw new APIError(404, 'Offer not found');
  emitOffersUpdated({ action: 'deleted', id: req.params.id });
  return res.status(200).json(new APIResponse(200, null, 'Offer deleted'));
});

export { getActiveOffers, getAllOffers, createOffer, updateOffer, deleteOffer };