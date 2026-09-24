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
  const { isStoreOpen, closedNotice, reopenTime } = req.body;

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
  settings.updatedBy = req.user?._id;

  await settings.save();

  emitStoreStatus({
    isStoreOpen: settings.isStoreOpen,
    closedNotice: settings.closedNotice,
    reopenTime: settings.reopenTime,
  });

  return res.status(200).json(
    new APIResponse(200, settings, `Store marked ${settings.isStoreOpen ? 'OPEN' : 'CLOSED'}`)
  );
});
