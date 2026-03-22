import User from '../models/user.model.js';
import { sendFCM } from '../utils/send-fcm.js';
import { asyncHandler } from '../utils/async-handler.js';
import { APIResponse } from '../utils/api-response.js';
import { APIError } from '../utils/api-error.js';
 
// POST /api/admin/broadcast 
const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, body, data = {} } = req.body;
  if (!title || !body) throw new APIError(400, 'title and body are required');
 
  // Get all users who have an FCM token
  const users = await User.find({ fcmToken: { $ne: null } }).select('fcmToken');
 
  let sent   = 0;
  let failed = 0;
 
  for (const user of users) {
    try {
      await sendFCM(user.fcmToken, title, body, { type: 'promotional', ...data });
      sent++;
    } catch {
      failed++;
    }
  }
 
  return res.status(200).json(
    new APIResponse(200, { totalUsers: users.length, sent, failed }, 'Broadcast sent')
  );

});
 
export { broadcastNotification };
