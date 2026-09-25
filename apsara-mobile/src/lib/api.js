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

export const setApiBaseUrl = (newUrl) => {
  api.defaults.baseURL = newUrl;
};

export default api;
