import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import socket, { connectOrderSocket, leaveOrderSocket } from '../lib/socket';
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
import AnnouncementsModal from '../components/common/AnnouncementsModal';
import AnnouncementCard from '../components/home/AnnouncementCard';

if (Platform.OS === 'android' && !global?.nativeFabricUIManager && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { activeOrder, updateActiveOrderStatus, saveActiveOrder, syncActiveOrders } = useCart();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [dismissedBroadcastIds, setDismissedBroadcastIds] = useState([]);
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [offers, setOffers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState(null);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [storeNotice, setStoreNotice] = useState('');

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

    const handleOffersUpdated = () => {
      Promise.allSettled([
        api.get('/offers/active'),
        api.get('/products'),
      ]).then(([offersRes, prodsRes]) => {
        if (offersRes.status === 'fulfilled' && offersRes.value.data?.data) {
          setOffers([...offersRes.value.data.data]);
        }
        if (prodsRes.status === 'fulfilled' && prodsRes.value.data?.data) {
          setProducts(prodsRes.value.data.data);
        }
      }).catch(() => {});
    };

    const handleProductsUpdated = () => {
      api.get('/products')
        .then((res) => {
          if (res.data?.data) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setProducts(res.data.data);
          }
        })
        .catch(() => {});
    };

    const handleStoreStatusChanged = (statusData) => {
      if (statusData) {
        setIsStoreOpen(statusData.isStoreOpen ?? true);
        if (statusData.closedNotice) setStoreNotice(statusData.closedNotice);
      }
    };

    const handleBroadcastMessage = (msg) => {
      const msgId = msg._id?.toString?.() || msg._id;
      setBroadcasts((prev) => [msg, ...prev.filter((b) => (b._id?.toString?.() || b._id) !== msgId)]);
    };

    const handleSocketConnect = () => {
      fetchData();
    };

    socket.on('connect', handleSocketConnect);
    socket.on('offers_updated', handleOffersUpdated);
    socket.on('products_updated', handleProductsUpdated);
    socket.on('store_status_changed', handleStoreStatusChanged);
    socket.on('broadcast_message', handleBroadcastMessage);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleSocketConnect);
      socket.off('offers_updated', handleOffersUpdated);
      socket.off('products_updated', handleProductsUpdated);
      socket.off('store_status_changed', handleStoreStatusChanged);
      socket.off('broadcast_message', handleBroadcastMessage);
    };
  }, [fetchData, loadDismissedBroadcasts]);

  useFocusEffect(
    useCallback(() => {
      syncActiveOrderFromBackend();
      fetchData();
    }, [syncActiveOrderFromBackend, fetchData])
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    syncActiveOrderFromBackend();
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category?._id === selectedCategory)
    : products;

  const smoothTransition = useCallback(() => {
    LayoutAnimation.configureNext({
      duration: 600,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        springDamping: 0.9,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  }, []);

  const activeCategoryName = selectedCategory
    ? categories.find((c) => c._id === selectedCategory)?.name || 'Flavours'
    : 'Fresh Handcrafted Scoops';

  const handleSelectCategory = useCallback((catId) => {
    smoothTransition();
    setSelectedCategory(catId);
  }, [smoothTransition]);

  const handleBannerPress = useCallback((banner) => {
    smoothTransition();
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
  }, [categories, smoothTransition]);

  const renderProductItem = useCallback(({ item }) => (
    <ProductCard
      product={item}
      onOpenVariants={(p) => setSelectedProductForVariants(p)}
    />
  ), []);

  const listHeaderComponent = useMemo(() => (
    <View>
      <BannerCarousel offers={offers} onBannerPress={handleBannerPress} />

      <CategoryChips
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{activeCategoryName}</Text>
          <Text style={styles.sectionSubtitle}>100% Pure Milk & Natural Flavours</Text>
        </View>

        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={() => {
            smoothTransition();
            setSelectedCategory(null);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  ), [offers, handleBannerPress, categories, selectedCategory, activeCategoryName, handleSelectCategory, smoothTransition]);

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
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
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
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md + 2,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
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
