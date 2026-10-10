import admin from '../config/firebase.js';
import User from '../models/user.model.js';
import { sendExpoPush } from './send-push.js';

const sendFCM = async (token, title, body, data = {}) => {
  if (!token) return;

  const stringData = Object.fromEntries(
    Object.entries(data || {}).map(([k, v]) => [k, String(v ?? '')])
  );

  // If token is an Expo Push Token, route to Expo Push API
  if (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken')) {
    try {
      await sendExpoPush([{
        to: token,
        sound: 'default',
        title,
        body,
        channelId: 'order_updates',
        data: stringData,
      }]);
    } catch (err) {
      console.warn('[Push Warning] Expo push send failed:', err.message);
    }
    return;
  }

  // Otherwise, route to Firebase Cloud Messaging (native device token)
  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: { channelId: 'order_updates' },
      },
    });
  } catch (error) {
    if (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered'
    ) {
      await User.findOneAndUpdate(
        { fcmToken: token },
        { $set: { fcmToken: null } }
      );
    }
    console.error('FCM error:', error.code, error.message);
  }
};

export { sendFCM };