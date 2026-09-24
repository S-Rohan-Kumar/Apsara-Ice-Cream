import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { colors, spacing, radius, fontSize } from '../theme';
import SearchBar from '../components/common/SearchBar';
import ProductCard from '../components/home/ProductCard';
import VariantSelectorModal from '../components/common/VariantSelectorModal';
import FloatingCartBar from '../components/home/FloatingCartBar';

const INITIAL_RECENT_SEARCHES = [
  { id: '1', term: 'Roasted Almond', icon: 'search' },
  { id: '2', term: 'Belgian Chocolate', icon: 'ice-cream' },
  { id: '3', term: 'Alphonso Mango', icon: 'nutrition' },
  { id: '4', term: 'Zero Sugar', icon: 'leaf' },
  { id: '5', term: 'Malai Kulfi', icon: 'ice-cream' },
];

const TRENDING_CATEGORIES = [
  { id: 't1', name: 'Alphonso Mango', emoji: '🥭', query: 'Mango' },
  { id: 't2', name: 'Roasted Almond', emoji: '🥜', query: 'Almond' },
  { id: 't3', name: 'Belgian Dark', emoji: '🍫', query: 'Belgian' },
  { id: 't4', name: 'Malai Kulfi', emoji: '🍧', query: 'Kulfi' },
  { id: 't5', name: 'Guava Chilli', emoji: '🌶️', query: 'Guava' },
  { id: 't6', name: 'Sitaphal', emoji: '🍈', query: 'Sitaphal' },
];

export default function SearchScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState(INITIAL_RECENT_SEARCHES);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState(null);

  useEffect(() => {
    loadAllProducts();
  }, []);

  const loadAllProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      setProducts(res.data?.data || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTerm = (term) => {
    setQuery(term);
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
  };

  const filtered = query.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category?.name?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor={colors.white} translucent={false} />

      <View style={[styles.topSection, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.searchBarWrapper}>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              autoFocus={true}
            />
          </View>
        </View>
      </View>

      {!query.trim() ? (
        <ScrollView style={styles.discoveryScroll} showsVerticalScrollIndicator={false}>
          {recentSearches.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Recent searches</Text>
                <TouchableOpacity onPress={handleClearRecent} activeOpacity={0.7}>
                  <Text style={styles.clearBtnText}>clear</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.chipsContainer}>
                {recentSearches.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.chip}
                    onPress={() => handleSelectTerm(item.term)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={item.icon} size={15} color={colors.textSecondary} style={styles.chipIcon} />
                    <Text style={styles.chipText}>{item.term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>Trending in your city</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingScrollContent}
            >
              {TRENDING_CATEGORIES.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.trendingCard}
                  onPress={() => handleSelectTerm(item.query)}
                  activeOpacity={0.8}
                >
                  <View style={styles.trendingAvatar}>
                    <Text style={styles.trendingEmoji}>{item.emoji}</Text>
                  </View>
                  <Text style={styles.trendingLabel} numberOfLines={2}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>Popular Flavours</Text>
            <View style={styles.chipsContainer}>
              {['Belgian Chocolate', 'Roasted Almond', 'Zero Sugar', 'Malai Kulfi', 'Guava Chilli', 'Cassata', 'Dry Fruit Overload'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.popularChip}
                  onPress={() => handleSelectTerm(item)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.popularChipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Searching flavours...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onOpenVariants={(p) => setSelectedProductForVariants(p)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No flavours match "{query}"</Text>
              <Text style={styles.emptySubtitle}>Try searching for 'Almond', 'Mango', or 'Kulfi'</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topSection: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  backButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarWrapper: {
    flex: 1,
  },
  discoveryScroll: {
    flex: 1,
  },
  sectionBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.2,
  },
  clearBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.primary,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    gap: 6,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  chipIcon: {
    marginRight: 2,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.text,
  },
  trendingScrollContent: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  trendingCard: {
    alignItems: 'center',
    width: 72,
  },
  trendingAvatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  trendingEmoji: {
    fontSize: 28,
  },
  trendingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
  },
  popularChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  popularChipText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: 115,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
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
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 44,
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
