import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import { syncFcmTokenWithBackend, unregisterPushNotificationsAsync } from '../lib/notifications';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('user_token');
      const storedUser = await AsyncStorage.getItem('user_data');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        syncFcmTokenWithBackend().catch(() => {});
        try {
          const { data } = await api.get('/auth/me');
          if (data?.data) {
            setUser(data.data);
            await AsyncStorage.setItem('user_data', JSON.stringify(data.data));
          }
        } catch (e) {}
      }
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    await AsyncStorage.setItem('user_token', newToken);
    await AsyncStorage.setItem('user_data', JSON.stringify(userData));
    syncFcmTokenWithBackend().catch(() => {});
  };

  const logout = async () => {
    unregisterPushNotificationsAsync().catch(() => {});
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem('user_token');
    await AsyncStorage.removeItem('user_data');
  };

  const updateUser = async (updatedFields) => {
    const updated = { ...user, ...updatedFields };
    setUser(updated);
    await AsyncStorage.setItem('user_data', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
