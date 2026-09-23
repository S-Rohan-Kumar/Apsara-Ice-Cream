import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const LocationContext = createContext(null);

export const LocationProvider = ({ children }) => {
  const [address, setAddress] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [landmark, setLandmark] = useState('');
  const [addressType, setAddressType] = useState('Home');
  const [phone, setPhone] = useState('');
  const [coords, setCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    loadLocation();
  }, []);

  const loadLocation = async () => {
    try {
      const storedAddr = await AsyncStorage.getItem('user_address');
      const storedFlat = await AsyncStorage.getItem('user_flat_no');
      const storedLandmark = await AsyncStorage.getItem('user_landmark');
      const storedType = await AsyncStorage.getItem('user_address_type');
      const storedPhone = await AsyncStorage.getItem('user_phone');
      const storedCoords = await AsyncStorage.getItem('user_coords');

      if (storedAddr) setAddress(storedAddr);
      if (storedFlat) setFlatNo(storedFlat);
      if (storedLandmark) setLandmark(storedLandmark);
      if (storedType) setAddressType(storedType);
      if (storedPhone) setPhone(storedPhone);
      if (storedCoords) setCoords(JSON.parse(storedCoords));

      if (!storedAddr) {
        detectLocation();
      }
    } catch (e) {}
  };

  const updateLocation = async (newAddress, type = 'Home', newPhone, newCoords, newFlat = '', newLandmark = '') => {
    setAddress(newAddress);
    setAddressType(type);
    setFlatNo(newFlat);
    setLandmark(newLandmark);
    if (newPhone) setPhone(newPhone);
    if (newCoords) {
      setCoords(newCoords);
      await AsyncStorage.setItem('user_coords', JSON.stringify(newCoords));
    }
    await AsyncStorage.setItem('user_address', newAddress);
    await AsyncStorage.setItem('user_flat_no', newFlat);
    await AsyncStorage.setItem('user_landmark', newLandmark);
    await AsyncStorage.setItem('user_address_type', type);
    if (newPhone) await AsyncStorage.setItem('user_phone', newPhone);
  };

  const detectLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      setCoords(newCoords);
      await AsyncStorage.setItem('user_coords', JSON.stringify(newCoords));

      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: newCoords.lat,
          longitude: newCoords.lng,
        });

        if (reverse && reverse.length > 0) {
          const r = reverse[0];
          const parts = [
            r.name,
            r.street,
            r.district || r.subregion,
            r.city,
            r.postalCode,
          ].filter(Boolean);
          if (parts.length > 0) {
            const detectedAddr = parts.join(', ');
            setAddress(detectedAddr);
            await AsyncStorage.setItem('user_address', detectedAddr);
          }
        }
      } catch (e) {}

      return newCoords;
    } catch (e) {
      return null;
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <LocationContext.Provider
      value={{
        address,
        flatNo,
        landmark,
        addressType,
        phone,
        coords,
        isLocating,
        detectLocation,
        updateLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
