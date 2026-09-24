import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import io from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { connectOrderSocket, leaveOrderSocket } from '../lib/socket';
import { colors, spacing, radius, fontSize } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import Header from '../components/common/Header';
import SearchBar from '../components/common/SearchBar';
import BannerCarousel from '../components/home/BannerCarousel';
import CategoryChips from '../components/home/CategoryChips';
import ProductCard from '../components/home/ProductCard';
import VariantSelectorModal from '../components/common/VariantSelectorModal';
import FloatingCartBar from '../components/home/FloatingCartBar';
import AnnouncementCard from '../components/home/AnnouncementCard';
import AnnouncementsModal from '../components/common/AnnouncementsModal';
import LiveBroadcastBanner from '../components/common/LiveBroadcastBanner';

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { activeOrder, updateActiveOrderStatus, saveActiveOrder, syncActiveOrders } = useCart();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [dismissedBroadcastIds, setDismissedBroadcastIds] = useState([]);
  const [liveBroadcast, setLiveBroadcast] = useState(null);
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [offers, setOffers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState(null);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [storeNotice, setStoreNotice] = useState('');

  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const activeOrderRef = useRef(activeOrder);
  activeOrderRef.current = activeOrder;

  const fetchData = useCallback(async () => {
    try {
      const [catsRes, prodsRes, bcastRes, offersRes, storeRes] = await Promise.allSettled([
        api.get('/categories'),
        api.get('/products'),
        api.get('/notifications/broadcasts'),
        api.get('/offers/active'),
        api.get('/admin/store-status'),
      ]);

      if (catsRes.status === 'fulfilled') {
        setCategories(catsRes.value.data?.data || []);
      }
      if (prodsRes.status === 'fulfilled') {
        setProducts(prodsRes.value.data?.data || []);
      }
      if (bcastRes.status === 'fulfilled') {
        setBroadcasts(bcastRes.value.data?.data || []);
      }
      if (offersRes.status === 'fulfilled') {
        setOffers(offersRes.value.data?.data || []);
      }
      if (storeRes.status === 'fulfilled') {
        const sData = storeRes.value.data?.data;
        if (sData) {
          setIsStoreOpen(sData.isStoreOpen ?? true);
          if (sData.closedNotice) setStoreNotice(sData.closedNotice);
        }
      }
    } catch (err) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const syncActiveOrderFromBackend = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/orders/my');
      const orderList = res.data?.data?.orders || res.data?.data || [];
      syncActiveOrders(orderList);
    } catch (e) {
    }
  }, [isAuthenticated, syncActiveOrders]);

  const loadDismissedBroadcasts = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('@apsara_dismissed_broadcasts');
      if (stored) {
        setDismissedBroadcastIds(JSON.parse(stored));
      }
    } catch (e) {
    }
  }, []);

  const handleDismissBroadcast = useCallback(async (broadcastId) => {
    if (!broadcastId) return;
    const idStr = broadcastId.toString();
    setDismissedBroadcastIds((prev) => {
      const next = prev.includes(idStr) ? prev : [...prev, idStr];
      AsyncStorage.setItem('@apsara_dismissed_broadcasts', JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    loadDismissedBroadcasts();
    fetchData();
    syncActiveOrderFromBackend();
    registerForPushNotificationsAsync();

    const socketUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('broadcast_message', (msg) => {
      const msgId = msg._id?.toString?.() || msg._id;
      setDismissedBroadcastIds((currentDismissed) => {
        if (!currentDismissed.includes(msgId)) {
          setLiveBroadcast(msg);
        }
        return currentDismissed;
      });
      setBroadcasts((prev) => [msg, ...prev.filter((b) => (b._id?.toString?.() || b._id) !== msgId)]);
    });

    socket.on('store_status_changed', (statusData) => {
      if (statusData) {
        setIsStoreOpen(statusData.isStoreOpen ?? true);
        if (statusData.closedNotice) setStoreNotice(statusData.closedNotice);
      }
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [fetchData, loadDismissedBroadcasts]);

  useFocusEffect(
    useCallback(() => {
      syncActiveOrderFromBackend();
    }, [syncActiveOrderFromBackend])
  );

  useEffect(() => {
    if (!activeOrder?.orderId) return;

    connectOrderSocket(activeOrder.orderId, (newStatus) => {
      if (newStatus === 'delivered' || newStatus === 'cancelled') {
        syncActiveOrderFromBackend();
      } else {
        updateActiveOrderStatus(newStatus);
      }
    });

    return () => {
      leaveOrderSocket(activeOrder.orderId);
    };
  }, [activeOrder?.orderId, syncActiveOrderFromBackend, updateActiveOrderStatus]);

  useEffect(() => {
    if (!liveBroadcast) return;
    const timer = setTimeout(() => {
      setLiveBroadcast(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [liveBroadcast]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    syncActiveOrderFromBackend();
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category?._id === selectedCategory)
    : products;

  const latestAnnouncement =
    broadcasts.length > 0 &&
    !dismissedBroadcastIds.includes(broadcasts[0]._id?.toString?.() || broadcasts[0]._id)
      ? broadcasts[0]
      : null;

  const activeCategoryName = selectedCategory
    ? categories.find((c) => c._id === selectedCategory)?.name || 'Flavours'
    : 'Fresh Handcrafted Scoops';

  const handleBannerPress = useCallback((banner) => {
    const targetCatId =
      banner.categoryId ||
      banner.category?._id ||
      (typeof banner.category === 'string' ? banner.category : null);

    if (targetCatId) {
      setSelectedCategory(targetCatId);
      flatListRef.current?.scrollToOffset({ offset: 320, animated: true });
      return;
    }

    const titleLower = (banner.title || '').toLowerCase();
    if (banner.code === 'ZEROSUGAR' || titleLower.includes('zero')) {
      const zeroCat = categories.find((c) => c.name.toLowerCase().includes('zero'));
      if (zeroCat) {
        setSelectedCategory(zeroCat._id);
        flatListRef.current?.scrollToOffset({ offset: 320, animated: true });
        return;
      }
    }

    if (titleLower.includes('fruit')) {
      const fruitCat = categories.find((c) => c.name.toLowerCase().includes('fruit'));
      if (fruitCat) {
        setSelectedCategory(fruitCat._id);
        flatListRef.current?.scrollToOffset({ offset: 320, animated: true });
        return;
      }
    }

    if (titleLower.includes('kulfi')) {
      const kulfiCat = categories.find((c) => c.name.toLowerCase().includes('kulfi'));
      if (kulfiCat) {
        setSelectedCategory(kulfiCat._id);
        flatListRef.current?.scrollToOffset({ offset: 320, animated: true });
        return;
      }
    }

    setSelectedCategory(null);
    flatListRef.current?.scrollToOffset({ offset: 320, animated: true });
  }, [categories]);

  const renderProductItem = useCallback(({ item }) => (
    <ProductCard
      product={item}
      onOpenVariants={(p) => setSelectedProductForVariants(p)}
    />
  ), []);

  const listHeaderComponent = useMemo(() => (
    <View>
      {latestAnnouncement ? (
        <AnnouncementCard
          announcement={latestAnnouncement}
          onOpenAll={() => setShowAnnouncementsModal(true)}
          onDismiss={() => handleDismissBroadcast(latestAnnouncement._id)}
        />
      ) : null}

      <BannerCarousel offers={offers} onBannerPress={handleBannerPress} />

      <CategoryChips
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{activeCategoryName}</Text>
          <Text style={styles.sectionSubtitle}>100% Pure Milk & Natural Flavours</Text>
        </View>

        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={() => setSelectedCategory(null)}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  ), [latestAnnouncement, offers, handleBannerPress, categories, selectedCategory, activeCategoryName, handleDismissBroadcast]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" backgroundColor={colors.primary} translucent={false} />

      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <Header
          onLocationPress={() => navigation.navigate(isAuthenticated ? 'Profile' : 'Login')}
          onProfilePress={() => navigation.navigate(isAuthenticated ? 'Profile' : 'Login')}
          onNotificationsPress={() => setShowAnnouncementsModal(true)}
          hasBroadcasts={broadcasts.length > 0}
        />

        <SearchBar
          isButton={true}
          onPress={() => navigation.navigate('Search')}
        />

        {!isStoreOpen && (
          <View style={styles.storeClosedBanner}>
            <Ionicons name="moon" size={14} color="#991B1B" />
            <Text style={styles.storeClosedBannerText} numberOfLines={1}>
              {storeNotice || "Store is currently closed for orders • Reopening soon!"}
            </Text>
          </View>
        )}
      </View>

      {liveBroadcast ? (
        <LiveBroadcastBanner
          broadcast={liveBroadcast}
          onPress={() => {
            handleDismissBroadcast(liveBroadcast._id);
            setLiveBroadcast(null);
            setShowAnnouncementsModal(true);
          }}
          onDismiss={() => {
            handleDismissBroadcast(liveBroadcast._id);
            setLiveBroadcast(null);
          }}
        />
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Scooping fresh flavours...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeaderComponent}
          renderItem={renderProductItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🍨</Text>
              <Text style={styles.emptyTitle}>No flavours found</Text>
              <Text style={styles.emptySubtitle}>Check back soon for freshly churned batches</Text>
            </View>
          }
        />
      )}

      <FloatingCartBar
        onPress={() => navigation.navigate('Cart')}
        onTrackOrder={(ord) =>
          navigation.navigate('OrderTracking', {
            orderId: ord.orderId,
            orderNumber: ord.orderNumber,
          })
        }
      />

      <VariantSelectorModal
        visible={!!selectedProductForVariants}
        product={selectedProductForVariants}
        onClose={() => setSelectedProductForVariants(null)}
      />

      <AnnouncementsModal
        visible={showAnnouncementsModal}
        onClose={() => setShowAnnouncementsModal(false)}
        broadcasts={broadcasts}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  storeClosedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    gap: 6,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  storeClosedBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
    flex: 1,
  },
  listContent: {
    paddingBottom: 115,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md + 1,
    fontWeight: '900',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.primary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
});
