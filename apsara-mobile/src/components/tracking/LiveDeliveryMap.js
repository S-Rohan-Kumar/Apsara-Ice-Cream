import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Text, Animated, Easing } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

const LiveDeliveryMap = forwardRef(function LiveDeliveryMap(
  {
    storeLocation = { lat: 13.0033, lng: 77.6834, title: 'Apsara KR Puram Store' },
    customerLocation,
    riderLocation,
  },
  ref
) {
  const mapRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  useImperativeHandle(ref, () => ({
    recenter: () => {
      mapRef.current?.animateToRegion(
        {
          latitude: currentRiderLat,
          longitude: currentRiderLng,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        500
      );
    },
    fitBounds: () => {
      mapRef.current?.fitToCoordinates([storeCoords, riderCoords, customerCoords], {
        edgePadding: { top: 90, right: 50, bottom: 250, left: 50 },
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

  useEffect(() => {
    if (riderLocation?.lat && riderLocation?.lng) {
      mapRef.current?.animateCamera(
        {
          center: { latitude: riderLocation.lat, longitude: riderLocation.lng },
          heading: riderHeading,
          pitch: 0,
        },
        { duration: 600 }
      );
    }
  }, [riderLocation?.lat, riderLocation?.lng, riderHeading]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        mapType="none"
        showsCompass={false}
        showsTraffic={false}
        showsBuildings={false}
        showsIndoors={false}
        showsMyLocationButton={false}
        rotateEnabled={false}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          minimumZ={0}
          flipY={false}
          zIndex={0}
          tileSize={256}
        />

        <Polyline
          coordinates={[storeCoords, riderCoords, customerCoords]}
          strokeColor="#1B5E4B"
          strokeWidth={5}
          zIndex={1}
        />

        <Marker coordinate={storeCoords} anchor={{ x: 0.5, y: 0.5 }} title="Apsara Store" zIndex={2}>
          <View style={styles.storeMarkerWrap}>
            <View style={styles.storePin}>
              <Text style={styles.pinEmoji}>🏪</Text>
            </View>
            <View style={styles.storeTag}>
              <Text style={styles.storeTagText}>Apsara Store</Text>
            </View>
          </View>
        </Marker>

        <Marker coordinate={customerCoords} anchor={{ x: 0.5, y: 0.5 }} title="Delivery Destination" zIndex={2}>
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
          zIndex={3}
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
  },
  map: {
    flex: 1,
  },
  storeMarkerWrap: {
    alignItems: 'center',
  },
  storePin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  pinEmoji: {
    fontSize: 20,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0F172A',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
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
    backgroundColor: '#86EFAC',
    opacity: 0.5,
  },
  riderPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#FDE047',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
  },
});
