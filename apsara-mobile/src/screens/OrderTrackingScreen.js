import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, fontSize } from '../theme';
import api from '../lib/api';
import {
  connectOrderSocket,
  leaveOrderSocket,
  connectRiderTracking,
  leaveRiderTracking,
} from '../lib/socket';
import LiveDeliveryMap from '../components/tracking/LiveDeliveryMap';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SNAP_COLLAPSED = 175;
const SNAP_EXPANDED = Math.round(SCREEN_HEIGHT * 0.78);

const MANDYA_STORE_LOCATION = {
  lat: 13.0033,
  lng: 77.6834,
  title: 'Apsara KR Puram Store',
};

const DEFAULT_CUSTOMER_LOCATION = {
  lat: 12.9985,
  lng: 77.6780,
};

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
};

const STEPS = [
  { key: 'placed', label: 'Order Confirmed', desc: 'Received at store hub', icon: 'checkmark-circle' },
  { key: 'preparing', label: 'Packing in Cold Storage', desc: 'Sub-zero insulated dry ice pack', icon: 'snow' },
  { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Rider on the way to you', icon: 'bicycle' },
  { key: 'delivered', label: 'Delivered', desc: 'Enjoy your fresh ice cream!', icon: 'ice-cream' },
];

export default function OrderTrackingScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { orderId, orderNumber } = route.params || {};

  const [order, setOrder] = useState(null);
  const [currentStatus, setCurrentStatus] = useState('placed');
  const [riderLocation, setRiderLocation] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);

  const mapRef = useRef(null);
  const sheetHeight = useRef(new Animated.Value(SNAP_COLLAPSED)).current;
  const isExpandedRef = useRef(false);

  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  const snapTo = (toExpanded) => {
    setIsExpanded(toExpanded);
    Animated.spring(sheetHeight, {
      toValue: toExpanded ? SNAP_EXPANDED : SNAP_COLLAPSED,
      friction: 8,
      tension: 48,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        const startHeight = isExpandedRef.current ? SNAP_EXPANDED : SNAP_COLLAPSED;
        const newHeight = Math.min(
          SNAP_EXPANDED + 30,
          Math.max(SNAP_COLLAPSED - 20, startHeight - gesture.dy)
        );
        sheetHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -25) {
          snapTo(true);
        } else if (gesture.dy > 25) {
          snapTo(false);
        } else {
          snapTo(!isExpandedRef.current);
        }
      },
    })
  ).current;

  useEffect(() => {
    loadOrderDetails();

    if (!orderId) return;

    connectOrderSocket(orderId, (newStatus) => {
      setCurrentStatus(newStatus);
    });

    const handleRiderUpdate = (data) => {
      if (data?.lat && data?.lng) {
        setRiderLocation({
          lat: data.lat,
          lng: data.lng,
          heading: data.heading || 0,
          updatedAt: data.updatedAt || new Date(),
        });
      }
    };

    connectRiderTracking(orderId, handleRiderUpdate);

    return () => {
      leaveOrderSocket(orderId);
      leaveRiderTracking(orderId, handleRiderUpdate);
    };
  }, [orderId]);

  const loadOrderDetails = async () => {
    if (!orderId) return;
    try {
      const res = await api.get(`/orders/${orderId}`);
      if (res.data?.data) {
        const ord = res.data.data;
        setOrder(ord);
        setCurrentStatus(ord.status || ord.orderStatus || 'placed');
        if (ord.delivery?.riderLocation?.lat && ord.delivery?.riderLocation?.lng) {
          setRiderLocation(ord.delivery.riderLocation);
        }
      }
    } catch (e) {
    }
  };

  const getStepIndex = (status) => {
    switch (status) {
      case 'placed': return 0;
      case 'preparing': return 1;
      case 'out_for_delivery': return 2;
      case 'delivered': return 3;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  const activeIndex = getStepIndex(currentStatus);

  const customerLat = order?.delivery?.location?.lat || DEFAULT_CUSTOMER_LOCATION.lat;
  const customerLng = order?.delivery?.location?.lng || DEFAULT_CUSTOMER_LOCATION.lng;

  const riderDistance = riderLocation?.lat && riderLocation?.lng
    ? calculateDistanceKm(riderLocation.lat, riderLocation.lng, customerLat, customerLng)
    : calculateDistanceKm(MANDYA_STORE_LOCATION.lat, MANDYA_STORE_LOCATION.lng, customerLat, customerLng);

  const deliveryAddressText = order?.delivery?.address
    ? typeof order.delivery.address === 'string'
      ? order.delivery.address
      : [
          order.delivery.address.flat,
          order.delivery.address.street,
          order.delivery.address.area,
          order.delivery.address.city,
          order.delivery.address.pincode,
        ].filter(Boolean).join(', ')
    : 'Customer Delivery Address on Record';

  const handleCallPartner = () => {
    Linking.openURL('tel:+919876543210').catch(() => {});
  };

  const handleRecenter = () => {
    mapRef.current?.recenter();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="transparent" translucent={true} />

      <View style={styles.mapContainer}>
        <LiveDeliveryMap
          ref={mapRef}
          storeLocation={MANDYA_STORE_LOCATION}
          customerLocation={{
            lat: customerLat,
            lng: customerLng,
          }}
          riderLocation={riderLocation}
          onRouteUpdate={setRouteInfo}
        />
      </View>

      <View style={[styles.floatingHeader, { top: insets.top + 8 }]} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          style={styles.floatingRoundBtn}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.floatingStatusBadge}>
          <View style={styles.statusPulseDot}>
            <View style={styles.statusPulseRing} />
            <View style={styles.statusDotSolid} />
          </View>
          <Text style={styles.floatingStatusText}>
            {currentStatus === 'out_for_delivery'
              ? 'RIDER EN ROUTE'
              : currentStatus === 'preparing'
              ? 'PACKING ICE CREAM'
              : currentStatus === 'delivered'
              ? 'DELIVERED'
              : 'ORDER PLACED'}
          </Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.floatingRecenterBtnWrap,
          {
            bottom: Animated.add(sheetHeight, 16),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.floatingRecenterBtn}
          onPress={handleRecenter}
          activeOpacity={0.85}
        >
          <Ionicons name="locate" size={22} color={colors.primary} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        <View {...panResponder.panHandlers} style={styles.sheetHandleZone}>
          <View style={styles.grabBar} />

          <View style={styles.sheetHeaderRow}>
            <View style={styles.etaInfoCol}>
              <View style={styles.superfastBadge}>
                <Ionicons name="flash" size={10} color="#FFFFFF" />
                <Text style={styles.superfastText}>SUPERFAST • COLD CHAIN</Text>
              </View>
              <Text style={styles.etaMainTitle}>
                {currentStatus === 'delivered'
                  ? 'Delivered 🎉'
                  : currentStatus === 'out_for_delivery'
                  ? routeInfo
                    ? `${routeInfo.distanceKm} km away • ~${routeInfo.etaMinutes} mins`
                    : riderDistance
                    ? `${riderDistance} km away`
                    : 'Rider is on the way!'
                  : currentStatus === 'preparing'
                  ? 'Arriving in 15-20 Mins'
                  : 'Order Confirmed'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => snapTo(!isExpanded)}
              style={styles.sheetToggleBtn}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isExpanded ? 'chevron-down' : 'chevron-up'}
                size={22}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.riderPartnerCard}>
            <View style={styles.riderAvatarContainer}>
              <Ionicons name="bicycle" size={20} color={colors.primary} />
              <View style={styles.avatarVerifiedBadge}>
                <Ionicons name="checkmark" size={9} color={colors.white} />
              </View>
            </View>

            <View style={styles.riderDetails}>
              <View style={styles.riderNameRow}>
                <Text style={styles.riderName}>Apsara Express Partner</Text>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={10} color="#F59E0B" />
                  <Text style={styles.ratingText}>4.9</Text>
                </View>
              </View>
              <Text style={styles.riderSubtext}>Electric Scooter • -18°C Insulated Pack</Text>
            </View>

            <TouchableOpacity
              onPress={handleCallPartner}
              style={styles.callPartnerBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>

          {!isExpanded && (
            <TouchableOpacity
              onPress={() => snapTo(true)}
              style={styles.slideHintRow}
              activeOpacity={0.8}
            >
              <Text style={styles.slideHintText}>Slide up for order & billing details</Text>
              <Ionicons name="chevron-up" size={13} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.telemetryBar}>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>DISTANCE</Text>
              <Text style={styles.telemetryValue}>
                {riderDistance ? `${riderDistance} km` : 'En Route'}
              </Text>
            </View>
            <View style={styles.telemetryDivider} />
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>STORAGE TEMP</Text>
              <Text style={[styles.telemetryValue, { color: '#0284C7' }]}>-18°C Icy Cold</Text>
            </View>
            <View style={styles.telemetryDivider} />
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>GPS FEED</Text>
              <Text style={[styles.telemetryValue, { color: '#16A34A' }]}>🟢 Active</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Order Progress</Text>
            <View style={styles.timeline}>
              {STEPS.map((step, idx) => {
                const isPassed = activeIndex >= idx;
                const isCurrent = activeIndex === idx;

                return (
                  <View key={step.key} style={styles.timelineStep}>
                    <View style={styles.stepIndicatorCol}>
                      <View
                        style={[
                          styles.dot,
                          isPassed && styles.dotPassed,
                          isCurrent && styles.dotCurrent,
                        ]}
                      >
                        <Ionicons
                          name={step.icon}
                          size={13}
                          color={isPassed ? colors.white : colors.textMuted}
                        />
                      </View>
                      {idx < STEPS.length - 1 && (
                        <View
                          style={[
                            styles.connectorLine,
                            activeIndex > idx && styles.connectorLinePassed,
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.stepContent}>
                      <Text
                        style={[
                          styles.stepTitle,
                          isPassed && styles.stepTitlePassed,
                          isCurrent && styles.stepTitleCurrent,
                        ]}
                      >
                        {step.label}
                      </Text>
                      <Text style={styles.stepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Delivery Destination</Text>
            <View style={styles.addressRow}>
              <View style={styles.addressIconWrap}>
                <Ionicons name="location" size={18} color={colors.primary} />
              </View>
              <View style={styles.addressTextWrap}>
                <Text style={styles.addressLabel}>
                  {order?.delivery?.address?.addressType?.toUpperCase() || 'HOME'}
                </Text>
                <Text style={styles.addressFull}>
                  {deliveryAddressText}
                </Text>
              </View>
            </View>
          </View>

          {order && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Order Summary</Text>
              {order.items?.map((item, idx) => (
                <View key={idx} style={styles.summaryItemRow}>
                  <Text style={styles.summaryItemName}>
                    {item.quantity}x {item.productName} ({item.variant})
                  </Text>
                  <Text style={styles.summaryItemPrice}>₹{item.totalPrice}</Text>
                </View>
              ))}

              <View style={styles.divider} />

              <View style={styles.summaryBreakdownRow}>
                <Text style={styles.summaryBreakdownLabel}>Item Subtotal</Text>
                <Text style={styles.summaryBreakdownValue}>₹{order.pricing?.subtotal ?? 0}</Text>
              </View>

              {order.pricing?.discountAmount > 0 && (
                <View style={styles.summaryBreakdownRow}>
                  <Text style={styles.summaryDiscountLabel}>🏷️ Offer Discount</Text>
                  <Text style={styles.summaryDiscountValue}>-₹{order.pricing.discountAmount}</Text>
                </View>
              )}

              <View style={styles.summaryBreakdownRow}>
                <Text style={styles.summaryBreakdownLabel}>Delivery Fee</Text>
                <Text style={styles.summaryBreakdownValue}>
                  {order.pricing?.deliveryCharge === 0 ? 'FREE' : `₹${order.pricing?.deliveryCharge ?? 0}`}
                </Text>
              </View>

              <View style={styles.summaryBreakdownRow}>
                <Text style={styles.summaryBreakdownLabel}>Insulated Sub-Zero Packaging</Text>
                <Text style={styles.summaryBreakdownValue}>₹{order.pricing?.packagingFee ?? 5}</Text>
              </View>

              <View style={styles.summaryTotalRow}>
                <Text style={styles.summaryTotalLabel}>
                  {order.payment?.method === 'online' ? 'Total Paid' : 'To Pay on Delivery'}
                </Text>
                <Text style={styles.summaryTotalValue}>
                  ₹{order.pricing?.total ?? order.totalAmount ?? 0}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.backStoreBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
            activeOpacity={0.85}
          >
            <Text style={styles.backStoreBtnText}>Back to Store</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.allOrdersBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Orders' })}
            activeOpacity={0.85}
          >
            <Text style={styles.allOrdersBtnText}>View All Orders</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
  },
  floatingHeader: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  floatingRoundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statusPulseDot: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  statusPulseRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#86EFAC',
    opacity: 0.7,
  },
  statusDotSolid: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  floatingStatusText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  floatingRecenterBtnWrap: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 20,
  },
  floatingRecenterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 16,
    zIndex: 30,
    overflow: 'hidden',
  },
  sheetHandleZone: {
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.white,
  },
  grabBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  etaInfoCol: {
    flex: 1,
    paddingRight: 8,
  },
  superfastBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
    gap: 4,
    marginBottom: 3,
  },
  superfastText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.4,
  },
  etaMainTitle: {
    fontSize: fontSize.md + 1,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.3,
  },
  sheetToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderPartnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  riderAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 10,
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  riderDetails: {
    flex: 1,
  },
  riderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riderName: {
    fontSize: fontSize.xs + 1,
    fontWeight: '800',
    color: colors.text,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  ratingText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
  },
  riderSubtext: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  callPartnerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  slideHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 6,
    paddingBottom: 2,
  },
  slideHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  telemetryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
  },
  telemetryItem: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#CBD5E1',
  },
  telemetryLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: 1,
    letterSpacing: 0.4,
  },
  telemetryValue: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.text,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontSize: fontSize.xs,
    fontWeight: '900',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.md,
  },
  timeline: {
    paddingLeft: spacing.xs,
  },
  timelineStep: {
    flexDirection: 'row',
    minHeight: 52,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 26,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotPassed: {
    backgroundColor: colors.primary,
  },
  dotCurrent: {
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  connectorLinePassed: {
    backgroundColor: colors.primary,
  },
  stepContent: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingBottom: spacing.md,
  },
  stepTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
  },
  stepTitlePassed: {
    color: colors.text,
  },
  stepTitleCurrent: {
    color: colors.primary,
    fontWeight: '900',
  },
  stepDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressTextWrap: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  addressFull: {
    fontSize: fontSize.xs,
    color: colors.text,
    marginTop: 2,
    lineHeight: 17,
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryItemName: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    paddingRight: 8,
  },
  summaryItemPrice: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.sm,
  },
  summaryBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryBreakdownLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryBreakdownValue: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: '700',
  },
  summaryDiscountLabel: {
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  summaryDiscountValue: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '800',
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  summaryTotalLabel: {
    fontSize: fontSize.sm,
    fontWeight: '900',
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.primary,
  },
  backStoreBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  backStoreBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  allOrdersBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  allOrdersBtnText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
});
