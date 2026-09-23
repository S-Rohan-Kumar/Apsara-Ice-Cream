import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../lib/api';
import { colors, spacing, radius, fontSize } from '../theme';
import SearchBar from '../components/common/SearchBar';
import ProductCard from '../components/home/ProductCard';
import VariantSelectorModal from '../components/common/VariantSelectorModal';
import FloatingCartBar from '../components/home/FloatingCartBar';

const TRENDING = [
  'Belgian Bite',
  'Alphonso Mango',
  'Zero Sugar',
  'Roasted Almond',
  'Malai Kulfi',
  'Guava Chilli',
];

export default function SearchScreen() {
  const navigation = useNavigation();

  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const filtered = query.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category?.name?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topSection}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          autoFocus={true}
        />
      </View>

      {!query.trim() ? (
        <View style={styles.trendingSection}>
          <Text style={styles.trendingTitle}>Trending Searches 🔥</Text>
          <View style={styles.chipRow}>
            {TRENDING.map((term) => (
              <TouchableOpacity
                key={term}
                style={styles.trendingChip}
                onPress={() => setQuery(term)}
                activeOpacity={0.7}
              >
                <Text style={styles.trendingText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
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

      <FloatingCartBar onPress={() => navigation.navigate('Cart')} />

      <VariantSelectorModal
        visible={!!selectedProductForVariants}
        product={selectedProductForVariants}
        onClose={() => setSelectedProductForVariants(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topSection: {
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  trendingSection: {
    padding: spacing.lg,
  },
  trendingTitle: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  trendingChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendingText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: 90,
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
