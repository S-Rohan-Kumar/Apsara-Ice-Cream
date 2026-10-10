import StoreSettings from '../models/storeSettings.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { APIResponse } from '../utils/api-response.js';
import { emitStoreStatus } from '../socket/socket.js';

export const getStoreStatus = asyncHandler(async (req, res) => {
  let settings = await StoreSettings.findOne();
  if (!settings) {
    settings = await StoreSettings.create({ isStoreOpen: true });
  }
  return res.status(200).json(
    new APIResponse(200, settings, 'Store status fetched successfully')
  );
});

export const updateStoreStatus = asyncHandler(async (req, res) => {
  const {
    isStoreOpen,
    closedNotice,
    reopenTime,
    baseDeliveryPrice,
    freeDeliveryThreshold,
    storeLocation,
  } = req.body;

  let settings = await StoreSettings.findOne();
  if (!settings) {
    settings = new StoreSettings();
  }

  if (typeof isStoreOpen === 'boolean') {
    settings.isStoreOpen = isStoreOpen;
  }
  if (closedNotice !== undefined) {
    settings.closedNotice = closedNotice;
  }
  if (reopenTime !== undefined) {
    settings.reopenTime = reopenTime;
  }

  // Delivery settings (Owner only)
  if (baseDeliveryPrice !== undefined || freeDeliveryThreshold !== undefined || storeLocation !== undefined) {
    if (req.user?.role === 'biller') {
      return res.status(403).json(new APIResponse(403, null, 'Only store owners can update delivery pricing'));
    }

    if (baseDeliveryPrice !== undefined) {
      settings.baseDeliveryPrice = Math.max(0, Number(baseDeliveryPrice));
    }
    if (freeDeliveryThreshold !== undefined) {
      settings.freeDeliveryThreshold = Math.max(0, Number(freeDeliveryThreshold));
    }
    if (storeLocation !== undefined && typeof storeLocation === 'object') {
      settings.storeLocation = {
        ...settings.storeLocation,
        ...storeLocation,
      };
    }
  }

  settings.updatedBy = req.user?._id;

  await settings.save();

  emitStoreStatus({
    isStoreOpen: settings.isStoreOpen,
    closedNotice: settings.closedNotice,
    reopenTime: settings.reopenTime,
    baseDeliveryPrice: settings.baseDeliveryPrice,
    freeDeliveryThreshold: settings.freeDeliveryThreshold,
    storeLocation: settings.storeLocation,
  });

  return res.status(200).json(
    new APIResponse(200, settings, 'Store settings updated successfully')
  );
});
