import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { View, StyleSheet, Text, Animated, Easing } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

const CLEAN_LIGHT_MAP_STYLE = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748B' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.neighborhood',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#F8FAFC' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#E2E8F0' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94A3B8' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#F1F5F9' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#E2E8F0' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#CBD5E1' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#E0F2FE' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#0284C7' }],
  },
];

const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const fetchRoadRoute = async (fromLat, fromLng, toLat, toLng) => {
  try {
    const url = `${OSRM_BASE}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { timeout: 8000 });
    const json = await res.json();
    if (json.code === 'Ok' && json.routes?.length > 0) {
      const route = json.routes[0];
      const coords = route.geometry.coordinates.map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }));
      return {
        coords,
        distanceMeters: route.distance,
        durationSeconds: route.duration,
      };
    }
    return null;
  } catch {
    return null;
  }
};

const LiveDeliveryMap = forwardRef(function LiveDeliveryMap(
  {
    storeLocation = { lat: 13.0033, lng: 77.6834, title: 'Apsara KR Puram Store' },
    customerLocation,
    riderLocation,
    onRouteUpdate,
  },
  ref
) {
  const mapRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const lastFetchedRiderRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  const [riderToCustomerRoute, setRiderToCustomerRoute] = useState([]);
  const [storeToRiderRoute, setStoreToRiderRoute] = useState([]);

  const customerLat = customerLocation?.lat || 12.9985;
  const customerLng = customerLocation?.lng || 77.6780;

  const currentRiderLat = riderLocation?.lat || storeLocation.lat;
  const currentRiderLng = riderLocation?.lng || storeLocation.lng;
  const riderHeading = riderLocation?.heading || 0;

  const storeCoords = { latitude: storeLocation.lat, longitude: storeLocation.lng };
  const customerCoords = { latitude: customerLat, longitude: customerLng };
  const riderCoords = { latitude: currentRiderLat, longitude: currentRiderLng };

  const initialRegion = {
    latitude: (storeLocation.lat + customerLat) / 2,
    longitude: (storeLocation.lng + customerLng) / 2,
    latitudeDelta: Math.max(0.025, Math.abs(storeLocation.lat - customerLat) * 1.8),
    longitudeDelta: Math.max(0.025, Math.abs(storeLocation.lng - customerLng) * 1.8),
  };

  const loadRoutes = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && lastFetchedRiderRef.current) {
        const dist = getDistanceMeters(
          lastFetchedRiderRef.current.lat,
          lastFetchedRiderRef.current.lng,
          currentRiderLat,
          currentRiderLng
        );
        if (dist < 60 && now - lastFetchTimeRef.current < 12000) {
          return;
        }
      }

      lastFetchedRiderRef.current = { lat: currentRiderLat, lng: currentRiderLng };
      lastFetchTimeRef.current = now;

      const [riderRoute, storeRoute] = await Promise.all([
        fetchRoadRoute(currentRiderLat, currentRiderLng, customerLat, customerLng),
        fetchRoadRoute(storeLocation.lat, storeLocation.lng, currentRiderLat, currentRiderLng),
      ]);

      if (riderRoute?.coords?.length > 0) {
        setRiderToCustomerRoute(riderRoute.coords);
        if (onRouteUpdate) {
          onRouteUpdate({
            distanceKm: Number((riderRoute.distanceMeters / 1000).toFixed(1)),
            etaMinutes: Math.ceil(riderRoute.durationSeconds / 60),
          });
        }
      } else {
        setRiderToCustomerRoute((prev) => (prev.length > 2 ? prev : [riderCoords, customerCoords]));
      }

      if (storeRoute?.coords?.length > 0) {
        setStoreToRiderRoute(storeRoute.coords);
      } else {
        setStoreToRiderRoute((prev) => (prev.length > 2 ? prev : [storeCoords, riderCoords]));
      }
    },
    [currentRiderLat, currentRiderLng, customerLat, customerLng, storeLocation.lat, storeLocation.lng]
  );

  useEffect(() => {
    loadRoutes(true);
  }, [customerLat, customerLng, storeLocation.lat, storeLocation.lng]);

  useEffect(() => {
    loadRoutes(false);
  }, [currentRiderLat, currentRiderLng]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const allCoords = [storeCoords, riderCoords, customerCoords];
      mapRef.current?.fitToCoordinates(allCoords, {
        edgePadding: { top: 90, right: 50, bottom: 260, left: 50 },
        animated: true,
      });
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  useImperativeHandle(ref, () => ({
    recenter: () => {
      const allCoords = [riderCoords, customerCoords];
      mapRef.current?.fitToCoordinates(allCoords, {
        edgePadding: { top: 100, right: 60, bottom: 270, left: 60 },
        animated: true,
      });
    },
    fitBounds: () => {
      const allCoords = [storeCoords, riderCoords, customerCoords];
      mapRef.current?.fitToCoordinates(allCoords, {
        edgePadding: { top: 90, right: 50, bottom: 260, left: 50 },
        animated: true,
      });
    },
  }));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        mapType="standard"
        userInterfaceStyle="light"
        customMapStyle={CLEAN_LIGHT_MAP_STYLE}
        showsCompass={false}
        showsTraffic={false}
        showsBuildings={true}
        showsIndoors={false}
        showsMyLocationButton={false}
        rotateEnabled={false}
      >
        {storeToRiderRoute.length > 1 && (
          <Polyline
            coordinates={storeToRiderRoute}
            strokeColor="#93C5FD"
            strokeWidth={3.5}
            lineDashPattern={[6, 6]}
            zIndex={1}
          />
        )}

        {riderToCustomerRoute.length > 1 && (
          <Polyline
            coordinates={riderToCustomerRoute}
            strokeColor="rgba(37, 99, 235, 0.22)"
            strokeWidth={10}
            zIndex={2}
          />
        )}

        {riderToCustomerRoute.length > 1 && (
          <Polyline
            coordinates={riderToCustomerRoute}
            strokeColor="#2563EB"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
            zIndex={3}
          />
        )}

        <Marker coordinate={storeCoords} anchor={{ x: 0.5, y: 0.5 }} title="Apsara Store" zIndex={4}>
          <View style={styles.storeMarkerWrap}>
            <View style={styles.storePin}>
              <Text style={styles.pinEmoji}>🏪</Text>
            </View>
            <View style={styles.storeTag}>
              <Text style={styles.storeTagText}>Apsara Store</Text>
            </View>
          </View>
        </Marker>

        <Marker coordinate={customerCoords} anchor={{ x: 0.5, y: 0.5 }} title="Delivery Destination" zIndex={4}>
          <View style={styles.customerMarkerWrap}>
            <View style={styles.customerPin}>
              <Text style={styles.pinEmoji}>🏠</Text>
            </View>
            <View style={styles.customerTag}>
              <Text style={styles.customerTagText}>Home</Text>
            </View>
          </View>
        </Marker>

        <Marker
          coordinate={riderCoords}
          anchor={{ x: 0.5, y: 0.5 }}
          title="Apsara Express Partner"
          flat={true}
          rotation={riderHeading}
          zIndex={5}
        >
          <View style={styles.riderMarkerWrap}>
            <Animated.View
              style={[
                styles.pulseRing,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <View style={styles.riderPin}>
              <Ionicons name="bicycle" size={24} color="#FFFFFF" />
            </View>
          </View>
        </Marker>
      </MapView>
    </View>
  );
});

export default LiveDeliveryMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  map: {
    flex: 1,
  },
  storeMarkerWrap: {
    alignItems: 'center',
  },
  storePin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  pinEmoji: {
    fontSize: 22,
  },
  storeTag: {
    marginTop: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  storeTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  customerMarkerWrap: {
    alignItems: 'center',
  },
  customerPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  customerTag: {
    marginTop: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  customerTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  riderMarkerWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#93C5FD',
    opacity: 0.55,
  },
  riderPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
  },
});
