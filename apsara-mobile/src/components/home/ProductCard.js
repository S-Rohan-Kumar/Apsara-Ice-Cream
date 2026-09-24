import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../theme';
import { useCart } from '../../contexts/CartContext';

export default function ProductCard({ product, onOpenVariants }) {
  const { getProductTotalQuantity, getItemQuantity, addToCart, decrementItem } = useCart();

  const isIceCream = product.category?.productType === 'icecream';
  const totalQty = isIceCream
    ? getProductTotalQuantity(product._id)
    : getItemQuantity(product._id, 'regular');

  const regularResolved = isIceCream
    ? product.resolvedPrices?.small || product.resolvedPrices?.regular || 0
    : product.resolvedPrices?.regular || 0;

  const regularBase = isIceCream
    ? product.basePrices?.small || product.basePrices?.regular || 0
    : product.basePrices?.regular || 0;

  const hasDiscount = Boolean(product.appliedOffer && regularBase > regularResolved);
  const showOfferBadge = Boolean(product.appliedOffer);

  const handleAddPress = () => {
    if (isIceCream) {
      onOpenVariants(product);
    } else {
      addToCart(product, 'regular', regularResolved);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderEmoji}>🍨</Text>
          </View>
        )}

        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Popular</Text>
        </View>

        {showOfferBadge && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{product.appliedOffer.discountPercent}% OFF</Text>
          </View>
        )}

        <View style={styles.floatingActionWrapper}>
          {totalQty > 0 ? (
            isIceCream ? (
              <TouchableOpacity
                style={styles.customizedPill}
                onPress={() => onOpenVariants(product)}
                activeOpacity={0.85}
              >
                <Text style={styles.customizedText}>{totalQty} in cart</Text>
                <Ionicons name="pencil" size={10} color={colors.primary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.stepperPill}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => decrementItem(product._id, 'regular')}
                >
                  <Ionicons name="remove" size={14} color="#EC4899" />
                </TouchableOpacity>
                <Text style={styles.stepperNumber}>{totalQty}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => addToCart(product, 'regular', regularResolved)}
                >
                  <Ionicons name="add" size={14} color="#EC4899" />
                </TouchableOpacity>
              </View>
            )
          ) : (
            <TouchableOpacity
              style={styles.addCircleBtn}
              onPress={handleAddPress}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={20} color="#EC4899" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.storeName} numberOfLines={1}>
          {product.category?.name || 'Apsara Natural'}
        </Text>

        <Text style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.pricingRow}>
          {hasDiscount && (
            <Text style={styles.strikethroughPrice}>₹{regularBase}</Text>
          )}
          <View style={hasDiscount ? styles.discountedPriceBadge : styles.normalPriceBadge}>
            <Text style={hasDiscount ? styles.discountedPriceText : styles.normalPriceText}>
              ₹{regularResolved}{isIceCream ? '+' : ''}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    width: '48%',
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 125,
    backgroundColor: '#F8FAFC',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radius.full,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  popularText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#065F46',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: radius.full,
  },
  discountText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.3,
  },
  floatingActionWrapper: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  addCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: '#FCE7F3',
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 6,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  stepperBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperNumber: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.text,
    minWidth: 14,
    textAlign: 'center',
  },
  customizedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.white,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  customizedText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  details: {
    paddingHorizontal: spacing.sm,
    paddingTop: 6,
    paddingBottom: spacing.sm,
  },
  storeName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  title: {
    fontSize: fontSize.xs + 1,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 16,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  strikethroughPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  discountedPriceBadge: {
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  discountedPriceText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#BE185D',
  },
  normalPriceBadge: {
    paddingVertical: 2,
  },
  normalPriceText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
  },
});
