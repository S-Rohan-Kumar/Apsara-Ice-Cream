import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';
import api from '../lib/api';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { colors, spacing, fontSize } from '../theme';
import { useAuth } from '../contexts/AuthContext';
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
  const { isAuthenticated } = useAuth();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState(null);
  const [liveBroadcast, setLiveBroadcast] = useState(null);
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState(null);

  const socketRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [catsRes, prodsRes, bcastRes] = await Promise.allSettled([
        api.get('/categories'),
        api.get('/products'),
        api.get('/notifications/broadcasts'),
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
    } catch (err) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    registerForPushNotificationsAsync();

    const socketUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('broadcast_message', (msg) => {
      setLiveBroadcast(msg);
      setBroadcasts((prev) => [msg, ...prev.filter((b) => b._id !== msg._id)]);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [fetchData]);

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
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category?._id === selectedCategory)
    : products;

  const latestAnnouncement =
    broadcasts.length > 0 && broadcasts[0]._id !== dismissedAnnouncementId
      ? broadcasts[0]
      : null;

  const renderHeader = () => (
    <View>
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

      {latestAnnouncement ? (
        <AnnouncementCard
          announcement={latestAnnouncement}
          onOpenAll={() => setShowAnnouncementsModal(true)}
          onDismiss={() => setDismissedAnnouncementId(latestAnnouncement._id)}
        />
      ) : null}

      <BannerCarousel
        onBannerPress={(b) => {
          if (b.code === 'ZEROSUGAR') {
            const zeroCat = categories.find((c) =>
              c.name.toLowerCase().includes('zero')
            );
            if (zeroCat) setSelectedCategory(zeroCat._id);
          }
        }}
      />

      <CategoryChips
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {selectedCategory
            ? categories.find((c) => c._id === selectedCategory)?.name || 'Flavours'
            : 'All Ice Creams & Flavours'}
        </Text>
        <Text style={styles.sectionCount}>{filteredProducts.length} items</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {liveBroadcast ? (
        <LiveBroadcastBanner
          broadcast={liveBroadcast}
          onPress={() => {
            setLiveBroadcast(null);
            setShowAnnouncementsModal(true);
          }}
          onDismiss={() => setLiveBroadcast(null)}
        />
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Scooping fresh flavours...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onOpenVariants={(p) => setSelectedProductForVariants(p)}
            />
          )}
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
              <Text style={styles.emptyEmoji}>🍦</Text>
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptySubtitle}>Check back soon for freshly churned batches</Text>
            </View>
          }
        />
      )}

      <FloatingCartBar onPress={() => navigation.navigate('Cart')} />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: 90,
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.text,
  },
  sectionCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '700',
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
