import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isExpoGo =
  Constants?.appOwnership === 'expo' ||
  Constants?.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications = null;
if (!isExpoGo && Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {}
}

export const registerForPushNotificationsAsync = async () => {
  if (Platform.OS === 'web' || isExpoGo || !Notifications) return null;

  try {
    if (!Device.isDevice) {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('order_updates', {
        name: 'Order Updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1B4332',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('store_broadcasts', {
        name: 'Store Announcements',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    let token = null;
    try {
      const deviceTokenObj = await Notifications.getDevicePushTokenAsync();
      token = deviceTokenObj?.data;
    } catch (e) {
      try {
        const expoTokenObj = await Notifications.getExpoPushTokenAsync();
        token = expoTokenObj?.data;
      } catch (err) {}
    }

    if (token) {
      await AsyncStorage.setItem('@apsara_fcm_token', token);
      const userToken = await AsyncStorage.getItem('user_token');
      if (userToken) {
        await api.post('/users/fcm-token', { token }).catch(() => {});
      }
    }

    return token;
  } catch (error) {
    return null;
  }
};

export const syncFcmTokenWithBackend = async () => {
  if (isExpoGo || !Notifications) return;

  try {
    let token = await AsyncStorage.getItem('@apsara_fcm_token');
    if (!token) {
      token = await registerForPushNotificationsAsync();
    } else {
      await api.post('/users/fcm-token', { token }).catch(() => {});
    }
  } catch (e) {}
};

export const unregisterPushNotificationsAsync = async () => {
  try {
    await api.delete('/users/fcm-token').catch(() => {});
  } catch (e) {}
};
