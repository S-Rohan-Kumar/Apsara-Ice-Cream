import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'https://apsara-ice-cream-cj1s.onrender.com/api';
  }
  return 'https://apsara-ice-cream-cj1s.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('user_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {}
  return config;
});

let onUnauthorizedCallback = null;

export const setOnUnauthorizedCallback = (cb) => {
  onUnauthorizedCallback = cb;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['user_token', 'user_data']).catch(() => {});
      if (typeof onUnauthorizedCallback === 'function') {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);

export const setApiBaseUrl = (newUrl) => {
  api.defaults.baseURL = newUrl;
};

export default api;
