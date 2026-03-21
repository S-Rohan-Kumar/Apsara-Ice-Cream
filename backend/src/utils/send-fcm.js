import admin from '../config/firebase.js';
import User from '../models/user.model.js';

const sendFCM = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) return;

  try {
    await admin.messaging().send({
      token        : fcmToken,
      notification : { title, body },
      data,
      android: {
        priority    : 'high',
        notification: { channelId: 'order_updates' },
      },
    });
  } catch (error) {
    if (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered'
    ) {
      await User.findOneAndUpdate(
        { fcmToken },
        { $set: { fcmToken: null } }
      );
    }
    console.error('FCM error:', error.code);
  }
};

export { sendFCM };