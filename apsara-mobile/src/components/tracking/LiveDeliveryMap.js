import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const MAP_STYLE = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ lightness: 15 }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#E0F2FE' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: '#F8FAFC' }],
  },
];

const LiveDeliveryMap = forwardRef(function LiveDeliveryMap(
  {
    storeLocation = { lat: 13.0033, lng: 77.6834, title: 'Apsara KR Puram Store' },
    customerLocation,
    riderLocation,
    containerStyle,
  },
  ref
) {
  const mapRef = useRef(null);

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
    latitudeDelta: Math.max(0.02, Math.abs(storeLocation.lat - customerLat) * 1.6),
    longitudeDelta: Math.max(0.02, Math.abs(storeLocation.lng - customerLng) * 1.6),
  };

  useImperativeHandle(ref, () => ({
    recenter: () => {
      mapRef.current?.animateToRegion(
        {
          latitude: currentRiderLat,
          longitude: currentRiderLng,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        500
      );
    },
    fitBounds: () => {
      mapRef.current?.fitToCoordinates([storeCoords, riderCoords, customerCoords], {
        edgePadding: { top: 90, right: 50, bottom: 240, left: 50 },
        animated: true,
      });
    },
  }));

  useEffect(() => {
    if (riderLocation?.lat && riderLocation?.lng) {
      mapRef.current?.animateCamera(
        {
          center: { latitude: riderLocation.lat, longitude: riderLocation.lng },
          heading: riderHeading,
          pitch: 15,
        },
        { duration: 600 }
      );
    }
  }, [riderLocation?.lat, riderLocation?.lng, riderHeading]);

  return (
    <View style={[styles.container, containerStyle]}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={initialRegion}
        customMapStyle={MAP_STYLE}
        showsCompass={false}
        showsTraffic={false}
        showsBuildings={true}
        loadingEnabled={true}
        loadingIndicatorColor="#1B5E4B"
        loadingBackgroundColor="#F8FAF9"
      >
        <Polyline
          coordinates={[storeCoords, riderCoords, customerCoords]}
          strokeColor="#1B5E4B"
          strokeWidth={5}
        />

        <Marker coordinate={storeCoords} anchor={{ x: 0.5, y: 0.5 }} title="Apsara Store">
          <View style={styles.storeMarkerWrap}>
            <View style={styles.storePin}>
              <Text style={styles.pinEmoji}>🏪</Text>
            </View>
            <View style={styles.storeTag}>
              <Text style={styles.storeTagText}>Apsara Store</Text>
            </View>
          </View>
        </Marker>

        <Marker coordinate={customerCoords} anchor={{ x: 0.5, y: 0.5 }} title="Delivery Destination">
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
        >
          <View style={styles.riderMarkerWrap}>
            <View style={styles.pulseRing} />
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
    width: '100%',
    height: '100%',
    backgroundColor: '#F8FAF9',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  storeMarkerWrap: {
    alignItems: 'center',
  },
  storePin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1B5E4B',
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
    backgroundColor: '#1B5E4B',
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#86EFAC',
    opacity: 0.4,
  },
  riderPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1B5E4B',
    borderWidth: 3,
    borderColor: '#FDE047',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B5E4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
  },
});
