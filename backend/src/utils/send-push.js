import axios from 'axios';
import admin from '../config/firebase.js';
import User from '../models/user.model.js';

export const sendExpoPush = async (messages) => {
  if (!messages || messages.length === 0) return { sent: 0, failed: 0 };

  const EXPO_API_URL = 'https://exp.host/--/api/v2/push/send';
  let sent = 0;
  let failed = 0;

  const BATCH_SIZE = 100;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const response = await axios.post(EXPO_API_URL, batch, {
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      const tickets = response.data?.data || [];
      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          failed++;
          if (ticket.details?.error === 'DeviceNotRegistered') {
            const badToken = batch[idx]?.to;
            if (badToken) {
              User.updateMany(
                { $or: [{ pushToken: badToken }, { fcmToken: badToken }] },
                { $set: { pushToken: null, fcmToken: null } }
              ).catch(() => {});
            }
          }
        }
      });
    } catch (err) {
      console.warn('[Push Service] Expo push batch error:', err.message);
      failed += batch.length;
    }
  }

  return { sent, failed };
};

export const sendFCMPush = async (fcmTokens, title, body, data = {}, imageUrl = '') => {
  if (!fcmTokens || fcmTokens.length === 0) return { sent: 0, failed: 0 };

  const img = imageUrl || data.imageUrl || data.image || '';
  let sent = 0;
  let failed = 0;

  for (const token of fcmTokens) {
    try {
      const message = {
        token,
        notification: {
          title,
          body,
          ...(img ? { imageUrl: img } : {}),
        },
        data: Object.fromEntries(
          Object.entries({ ...data, ...(img ? { imageUrl: img, image: img } : {}) }).map(([k, v]) => [k, String(v)])
        ),
        android: {
          priority: 'high',
          notification: {
            channelId: 'store_broadcasts',
            ...(img ? { imageUrl: img } : {}),
          },
        },
      };
      await admin.messaging().send(message);
      sent++;
    } catch (err) {
      failed++;
      if (
        err.code === 'messaging/invalid-registration-token' ||
        err.code === 'messaging/registration-token-not-registered'
      ) {
        User.findOneAndUpdate({ fcmToken: token }, { $set: { fcmToken: null } }).catch(() => {});
      }
    }
  }

  return { sent, failed };
};
