import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, fontSize } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import api from '../lib/api';
import { ensureProductImageCache, getCachedProductImage } from '../lib/productImageCache';

const STATUS_COLORS = {
  placed: { bg: '#FEF3C7', text: '#92400E', label: 'Order Placed' },
  preparing: { bg: '#DBEAFE', text: '#1E40AF', label: 'Packing' },
  out_for_delivery: { bg: '#E0E7FF', text: '#3730A3', label: 'Out for Delivery' },
  delivered: { bg: '#D1FAE5', text: '#065F46', label: 'Delivered' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' },
};

export default function OrdersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { addToCart, reorderItems, syncActiveOrders } = useCart();

  const formatOrderDate = (dateVal) => {
    try {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      await ensureProductImageCache();
      const res = await api.get('/orders/my');
      const orderList = res.data?.data?.orders || res.data?.data || [];
      setOrders(orderList);
      syncActiveOrders(orderList);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, syncActiveOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleReorder = (order) => {
    if (reorderItems && Array.isArray(order?.items)) {
      reorderItems(order.items);
    } else {
      order?.items?.forEach((item) => {
        const prod = item.product || {};
        const rawId = typeof prod === 'object' && prod !== null
          ? (prod._id?._id || prod._id || prod.id || prod.productId)
          : (item.product || item.productId);
        const prodIdStr = rawId ? (typeof rawId === 'object' ? (rawId._id?.toString?.() || rawId.toString?.() || '') : rawId.toString()) : '';
        if (!prodIdStr) return;
        const rawCatId = item.categoryId || (typeof prod === 'object' ? (prod.category?._id || prod.category || prod.categoryId) : null);
        const catIdStr = rawCatId ? (rawCatId._id ? rawCatId._id.toString() : rawCatId.toString()) : null;
        const v = (item.variant === 'single' ? 'regular' : item.variant) || 'regular';
        const unitPrice = typeof item.unitPrice === 'number' && item.unitPrice > 0 ? item.unitPrice : (item.price || 0);
        const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
        addToCart(
          {
            _id: prodIdStr,
            name: item.productName || (typeof prod === 'object' ? prod.name : '') || '',
            imageUrl: item.imageUrl || (typeof prod === 'object' ? prod.imageUrl : '') || '',
            categoryId: catIdStr,
            categoryName: item.categoryName || (typeof prod === 'object' ? prod.category?.name : '') || '',
            isZeroSugar: item.isZeroSugar ?? (typeof prod === 'object' ? prod.isZeroSugar : false) ?? false,
          },
          v,
          unitPrice,
          qty
        );
      });
    }
    navigation.navigate('Cart');
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" backgroundColor={colors.white} translucent={false} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔐</Text>
          <Text style={styles.emptyTitle}>Please log in</Text>
          <Text style={styles.emptySubtitle}>Log in with your phone to view your past orders</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor={colors.white} translucent={false} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          style={styles.headerBackBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Orders</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const statusKey = item.status || item.orderStatus || 'placed';
            const statusConfig = STATUS_COLORS[statusKey] || STATUS_COLORS.placed;
            const isActive = ['placed', 'preparing', 'out_for_delivery'].includes(statusKey);

            return (
              <View style={styles.orderCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.orderNumber}>Order #{item.orderNumber}</Text>
                    <Text style={styles.orderDate}>
                      {formatOrderDate(item.createdAt)}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusText, { color: statusConfig.text }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemsList}>
                  {item.items?.map((it, idx) => {
                    const imgUrl = getCachedProductImage(it);
                    return (
                      <View key={idx} style={styles.itemRow}>
                        {imgUrl ? (
                          <Image source={{ uri: imgUrl }} style={styles.itemThumb} resizeMode="contain" fadeDuration={0} />
                        ) : (
                          <View style={styles.itemThumbPlaceholder}>
                            <Text style={styles.itemThumbEmoji}>🍨</Text>
                          </View>
                        )}
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {it.productName}
                          </Text>
                          <Text style={styles.itemMeta}>
                            {it.quantity}x • {it.variant} • ₹{it.totalPrice || (it.unitPrice * it.quantity)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                  <Text style={styles.orderTotal}>Total: ₹{item.pricing?.total ?? item.totalAmount ?? 0}</Text>

                  <View style={styles.actionButtons}>
                    {isActive && (
                      <TouchableOpacity
                        style={styles.trackBtn}
                        onPress={() =>
                          navigation.navigate('OrderTracking', {
                            orderId: item._id,
                            orderNumber: item.orderNumber,
                          })
                        }
                        activeOpacity={0.8}
                      >
                        <Ionicons name="location" size={12} color={colors.primary} />
                        <Text style={styles.trackBtnText}>Track</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.reorderBtn}
                      onPress={() => handleReorder(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="repeat" size={12} color={colors.white} />
                      <Text style={styles.reorderBtnText}>Reorder</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySubtitle}>Order your first scoop of ice cream now!</Text>
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => navigation.navigate('Main', { screen: 'Home' })}
                activeOpacity={0.85}
              >
                <Text style={styles.loginBtnText}>Browse Store</Text>
              </TouchableOpacity>
            </View>
          }
        />
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
  headerBackBtn: {
    marginRight: spacing.md,
    padding: 2,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    color: colors.text,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  orderNumber: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.text,
  },
  orderDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  itemsList: {
    marginVertical: spacing.sm,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemThumb: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
  },
  itemThumbPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemThumbEmoji: {
    fontSize: 18,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.xs + 1,
    fontWeight: '700',
    color: colors.text,
  },
  itemMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderTotal: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  trackBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  reorderBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: spacing.lg,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  loginBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.white,
  },
});
