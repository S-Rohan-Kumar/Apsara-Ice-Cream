import User from "../models/user.model.js";
import Broadcast from "../models/broadcast.model.js";
import { emitBroadcast } from "../socket/socket.js";
import { sendExpoPush, sendFCMPush } from "../utils/send-push.js";
import { asyncHandler } from "../utils/async-handler.js";
import { APIResponse } from "../utils/api-response.js";
import { APIError } from "../utils/api-error.js";

const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, body, type = "promotional", data = {} } = req.body;
  if (!title?.trim() || !body?.trim()) {
    throw new APIError(400, "Title and body are required");
  }

  const broadcast = await Broadcast.create({
    title: title.trim(),
    body: body.trim(),
    type,
    sentBy: req.user?._id || null,
  });

  emitBroadcast({
    _id: broadcast._id,
    title: broadcast.title,
    body: broadcast.body,
    type: broadcast.type,
    createdAt: broadcast.createdAt,
    ...data,
  });

  const users = await User.find({
    $or: [
      { pushToken: { $ne: null } },
      { fcmToken: { $ne: null } },
    ],
  })
    .select("pushToken fcmToken")
    .lean();

  const expoMessages = [];
  const fcmTokens = [];

  users.forEach((u) => {
    const token = u.pushToken || u.fcmToken;
    if (!token) return;

    if (token.startsWith("ExponentPushToken") || token.startsWith("ExpoPushToken")) {
      expoMessages.push({
        to: token,
        sound: "default",
        title: broadcast.title,
        body: broadcast.body,
        data: {
          broadcastId: broadcast._id.toString(),
          type: broadcast.type,
          ...data,
        },
      });
    } else {
      fcmTokens.push(token);
    }
  });

  let sent = 0;
  let failed = 0;

  if (expoMessages.length > 0) {
    const expoResult = await sendExpoPush(expoMessages);
    sent += expoResult.sent;
    failed += expoResult.failed;
  }

  if (fcmTokens.length > 0) {
    const fcmResult = await sendFCMPush(fcmTokens, broadcast.title, broadcast.body, data);
    sent += fcmResult.sent;
    failed += fcmResult.failed;
  }

  broadcast.reachCount = users.length;
  broadcast.pushSent = sent;
  await broadcast.save();

  return res.status(200).json(
    new APIResponse(
      200,
      {
        broadcast,
        totalUsers: users.length,
        sent,
        failed,
      },
      "Broadcast delivered successfully"
    )
  );
});

const getRecentBroadcasts = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 30);
  const broadcasts = await Broadcast.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return res.status(200).json(
    new APIResponse(200, broadcasts, "Recent broadcasts retrieved")
  );
});

export { broadcastNotification, getRecentBroadcasts };