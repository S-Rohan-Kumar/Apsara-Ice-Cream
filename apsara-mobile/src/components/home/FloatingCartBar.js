import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../theme';
import { useCart } from '../../contexts/CartContext';

const STATUS_TEXT = {
  placed: 'Order Confirmed • Packing soon',
  preparing: 'Packing in Cold Storage ❄️',
  out_for_delivery: 'Out for Delivery 🛵',
};

export default function FloatingCartBar({ onPress, onTrackOrder, onDismiss }) {
  const { itemCount, grandTotal, items, activeOrder, activeOrders = [] } = useCart();
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);

  const displayOrders = activeOrders.length > 0 ? activeOrders : (activeOrder ? [activeOrder] : []);
  const validActiveOrders = displayOrders.filter(
    (o) => o && ['placed', 'preparing', 'out_for_delivery'].includes(o.status)
  );

  const isOrderActive = validActiveOrders.length > 0;

  if (isOrderActive) {
    const ordersCount = validActiveOrders.length;
    const safeIndex = selectedOrderIndex < ordersCount ? selectedOrderIndex : 0;
    const currentOrder = validActiveOrders[safeIndex] || validActiveOrders[0];
    const statusSubtitle = STATUS_TEXT[currentOrder.status] || 'Processing order';

    const handleCycleOrder = () => {
      if (ordersCount > 1) {
        setSelectedOrderIndex((prev) => (prev + 1) % ordersCount);
      }
    };

    const handleTrackPress = () => {
      if (onTrackOrder) {
        onTrackOrder(currentOrder);
      }
    };

    return (
      <View style={styles.container}>
        {ordersCount >= 3 && <View style={styles.stackLayer2} />}
        {ordersCount >= 2 && <View style={styles.stackLayer1} />}

        <View style={[styles.card, styles.orderCard]}>
          <TouchableOpacity
            style={styles.leftSection}
            onPress={ordersCount > 1 ? handleCycleOrder : handleTrackPress}
            activeOpacity={0.85}
          >
            <View style={styles.pulseIconContainer}>
              <Ionicons
                name={currentOrder.status === 'out_for_delivery' ? 'bicycle' : 'snow'}
                size={20}
                color={colors.primary}
              />
              <View style={styles.pulseDot} />
            </View>

            <View style={styles.storeInfo}>
              <View style={styles.orderTitleRow}>
                <Text style={styles.orderTitle}>
                  {ordersCount > 1 ? `Order #${currentOrder.orderNumber}` : 'Order in Progress'}
                </Text>
                <View style={styles.liveTag}>
                  <Text style={styles.liveTagText}>LIVE</Text>
                </View>
                {ordersCount > 1 && (
                  <View style={styles.stackBadge}>
                    <Ionicons name="copy-outline" size={10} color="#1E40AF" />
                    <Text style={styles.stackBadgeText}>{ordersCount} Orders</Text>
                  </View>
                )}
              </View>
              <Text style={styles.orderSubtitle} numberOfLines={1}>
                {ordersCount > 1 ? `${statusSubtitle} • Tap to switch` : statusSubtitle}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.trackBtn}
            onPress={handleTrackPress}
            activeOpacity={0.85}
          >
            <Text style={styles.trackBtnText}>Track</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (itemCount === 0) return null;

  const firstItemImage = items[0]?.product?.imageUrl || items[0]?.imageUrl;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.leftSection}
          onPress={onPress}
          activeOpacity={0.8}
        >
          {firstItemImage ? (
            <Image source={{ uri: firstItemImage }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={styles.thumbnailFallback}>
              <Text style={styles.thumbnailEmoji}>🍨</Text>
            </View>
          )}

          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>Apsara Handcrafted</Text>
            <Text style={styles.viewMenuText}>View full cart</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.rightSection}>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={onPress}
            activeOpacity={0.85}
          >
            <Text style={styles.checkoutText}>Checkout</Text>
            <View style={styles.checkoutDivider} />
            <Text style={styles.checkoutMeta}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'} | ₹{grandTotal}
            </Text>
          </TouchableOpacity>

          {onDismiss ? (
            <TouchableOpacity style={styles.closeBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    zIndex: 99,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  stackLayer2: {
    position: 'absolute',
    top: -10,
    left: 20,
    right: 20,
    height: 20,
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    zIndex: 1,
    elevation: 2,
  },
  stackLayer1: {
    position: 'absolute',
    top: -5,
    left: 10,
    right: 10,
    height: 18,
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    zIndex: 2,
    elevation: 4,
  },
  orderCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    paddingVertical: 12,
  },
  pulseIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#E8F5F1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 10,
  },
  pulseDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  orderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
  },
  liveTag: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  liveTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.5,
  },
  stackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    gap: 3,
  },
  stackBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1E40AF',
  },
  orderSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    gap: 4,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.white,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  thumbnail: {
    width: 42,
    height: 42,
    borderRadius: 12,
    marginRight: 10,
  },
  thumbnailFallback: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  thumbnailEmoji: {
    fontSize: 22,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.text,
  },
  viewMenuText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.full,
    gap: 6,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  checkoutText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.white,
  },
  checkoutDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  checkoutMeta: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
