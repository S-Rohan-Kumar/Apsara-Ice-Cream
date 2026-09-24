import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, fontSize } from '../theme';
import api from '../lib/api';
import { connectOrderSocket, leaveOrderSocket } from '../lib/socket';

const STEPS = [
  { key: 'placed', label: 'Order Confirmed', desc: 'Received at Mandya store', icon: 'checkmark-circle' },
  { key: 'preparing', label: 'Packing in Cold Storage', desc: 'Packed in insulated dry-ice bags', icon: 'snow' },
  { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Delivery partner on the way', icon: 'bicycle' },
  { key: 'delivered', label: 'Delivered', desc: 'Enjoy your fresh ice cream!', icon: 'ice-cream' },
];

export default function OrderTrackingScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { orderId, orderNumber } = route.params || {};

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState('placed');

  useEffect(() => {
    loadOrderDetails();

    connectOrderSocket(orderId, (newStatus) => {
      setCurrentStatus(newStatus);
    });

    return () => {
      leaveOrderSocket(orderId);
    };
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${orderId}`);
      if (res.data?.data) {
        setOrder(res.data.data);
        setCurrentStatus(res.data.data.status || res.data.data.orderStatus || 'placed');
      }
    } catch (e) {
    } finally {
      setLoading(false);
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

  const handleCallStore = () => {
    Linking.openURL('tel:+919876543210').catch(() => {});
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor={colors.white} translucent={false} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          style={styles.backButton}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Order #{order?.orderNumber || orderNumber || '...'}</Text>
          <Text style={styles.headerSubtitle}>Live Tracking</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.etaCard}>
            <View style={styles.etaHeader}>
              <View style={styles.flashBadge}>
                <Ionicons name="flash" size={13} color="#FFFFFF" />
                <Text style={styles.flashText}>SUPERFAST</Text>
              </View>
              <Text style={styles.etaTime}>
                {currentStatus === 'delivered' ? 'DELIVERED 🎉' : 'Arriving in 15-20 Mins'}
              </Text>
            </View>
            <Text style={styles.etaDesc}>
              {currentStatus === 'delivered'
                ? 'Your order was successfully delivered. Have a sweet day!'
                : 'Our delivery partner is rushing to bring your ice cream icy and fresh.'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Order Status</Text>

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
                          size={14}
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

          <View style={styles.card}>
            <View style={styles.deliveryPartnerRow}>
              <View style={styles.partnerAvatar}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
              <View style={styles.partnerInfo}>
                <Text style={styles.partnerName}>Apsara Delivery Partner</Text>
                <Text style={styles.partnerSub}>Vaccinated • Sub-Zero Ice Box Carrier</Text>
              </View>
              <TouchableOpacity onPress={handleCallStore} style={styles.callButton}>
                <Ionicons name="call" size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {order && (
            <View style={[styles.card, styles.itemsCard]}>
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
                <Text style={styles.summaryBreakdownLabel}>Item Total</Text>
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
                <Text style={styles.summaryBreakdownLabel}>Insulated Packaging</Text>
                <Text style={styles.summaryBreakdownValue}>₹{order.pricing?.packagingFee ?? 5}</Text>
              </View>

              <View style={styles.summaryBreakdownRow}>
                <Text style={styles.summaryBreakdownLabel}>Payment Mode</Text>
                <Text style={[styles.summaryBreakdownValue, order.payment?.method === 'online' && styles.summaryDiscountValue]}>
                  {order.payment?.method === 'online' ? '🟢 UPI / Online Paid' : '💵 Cash on Delivery (Pending)'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryTotalRow}>
                <Text style={styles.summaryTotalLabel}>
                  {order.payment?.method === 'online' ? 'Total Paid' : 'To Pay on Delivery'}
                </Text>
                <Text style={styles.summaryTotalValue}>₹{order.pricing?.total ?? order.totalAmount ?? 0}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Back to Store</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewOrdersBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Orders' })}
            activeOpacity={0.85}
          >
            <Text style={styles.viewOrdersBtnText}>View All Orders</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    padding: 4,
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: '800',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    padding: spacing.md,
  },
  etaCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  etaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    gap: 2,
  },
  flashText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.white,
  },
  etaTime: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.white,
  },
  etaDesc: {
    fontSize: fontSize.xs,
    color: '#D1FAE5',
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  timeline: {
    paddingLeft: spacing.xs,
  },
  timelineStep: {
    flexDirection: 'row',
    minHeight: 56,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 30,
  },
  dot: {
    width: 26,
    height: 26,
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
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 2,
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
  deliveryPartnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  partnerAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.text,
  },
  partnerSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsCard: {
    marginBottom: spacing.xl,
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  summaryItemName: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: '600',
  },
  summaryItemPrice: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.text,
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
    fontWeight: '700',
    color: colors.text,
  },
  summaryDiscountLabel: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '700',
  },
  summaryDiscountValue: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.primary,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  doneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  doneBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  viewOrdersBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: 40,
  },
  viewOrdersBtnText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
});
