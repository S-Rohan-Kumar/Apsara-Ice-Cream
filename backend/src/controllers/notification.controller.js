import User           from "../models/user.model.js";
import { sendFCM }    from "../utils/send-fcm.js";
import { asyncHandler } from "../utils/async-handler.js";
import { APIResponse }  from "../utils/api-response.js";
import { APIError }     from "../utils/api-error.js";

const FCM_BATCH_SIZE = 500; // Firestore FCM limit per multicast call

/**
 * POST /api/admin/broadcast
 *
 * BEFORE: for (const user of users) { await sendFCM(...) }
 *         Sequential — 1000 users = 1000 serial HTTP calls to Firebase
 *         Will timeout on any meaningful user count.
 *
 * AFTER:  Promise.allSettled in batches of 500
 *         1000 users = 2 batches of 500 parallel calls
 *         Completes in the time of 1 FCM call (not 1000)
 *
 * BEST:   Use Firebase Admin SDK's sendEachForMulticast() for true multicast.
 *         This function shows the batching pattern as a drop-in improvement
 *         if your sendFCM util wraps individual sends.
 */
const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, body, data = {} } = req.body;
  if (!title || !body) throw new APIError(400, "title and body are required");

  // Only fetch the FCM token — no need to load entire user documents
  const users = await User.find({ fcmToken: { $ne: null } })
    .select("fcmToken")
    .lean();

  if (users.length === 0) {
    return res.status(200).json(
      new APIResponse(200, { totalUsers: 0, sent: 0, failed: 0 }, "No users with FCM tokens")
    );
  }

  const payload = { type: "promotional", ...data };

  // Split into batches to avoid overwhelming Firebase with too many concurrent requests
  const batches = [];
  for (let i = 0; i < users.length; i += FCM_BATCH_SIZE) {
    batches.push(users.slice(i, i + FCM_BATCH_SIZE));
  }

  let sent   = 0;
  let failed = 0;

  // Process batches sequentially, but each batch's sends are parallel
  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map((user) => sendFCM(user.fcmToken, title, body, payload))
    );

    results.forEach((r) => {
      if (r.status === "fulfilled") sent++;
      else failed++;
    });
  }

  return res.status(200).json(
    new APIResponse(200, { totalUsers: users.length, sent, failed }, "Broadcast sent")
  );
});

export { broadcastNotification };