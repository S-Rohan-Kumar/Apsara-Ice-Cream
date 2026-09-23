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
            <Text style={styles.placeholderEmoji}>🍦</Text>
          </View>
        )}

        {product.isZeroSugar && (
          <View style={styles.zeroSugarBadge}>
            <Text style={styles.zeroSugarText}>Zero Sugar</Text>
          </View>
        )}

        {showOfferBadge && (
          <View style={styles.discountFloatingBadge}>
            <Text style={styles.discountFloatingText}>
              {product.appliedOffer.discountPercent}% OFF
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.categoryName} numberOfLines={1}>
          {product.category?.name || 'Ice Cream'}
        </Text>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.sizeIndicatorRow}>
          <Text style={styles.sizeIndicatorText}>
            {isIceCream ? 'Multiple sizes' : 'Standard pack'}
          </Text>
          {isIceCream && (
            <Ionicons name="chevron-down" size={11} color={colors.textSecondary} />
          )}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>
                ₹{regularResolved}
                {isIceCream ? '+' : ''}
              </Text>
              {hasDiscount && (
                <Text style={styles.originalPrice}>
                  ₹{regularBase}
                </Text>
              )}
            </View>
            {showOfferBadge && (
              <Text style={styles.offerTagText} numberOfLines={1}>
                {product.appliedOffer.title}
              </Text>
            )}
          </View>

          {totalQty > 0 ? (
            isIceCream ? (
              <TouchableOpacity
                style={styles.customizedButton}
                onPress={() => onOpenVariants(product)}
                activeOpacity={0.8}
              >
                <Text style={styles.customizedQtyText}>{totalQty} in cart</Text>
                <Ionicons name="pencil" size={10} color={colors.primary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => decrementItem(product._id, 'regular')}
                >
                  <Ionicons name="remove" size={12} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{totalQty}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => addToCart(product, 'regular', regularResolved)}
                >
                  <Ionicons name="add" size={12} color={colors.white} />
                </TouchableOpacity>
              </View>
            )
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddPress}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>ADD</Text>
              <Ionicons name="add" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
    width: '48%',
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  imageContainer: {
    width: '100%',
    height: 110,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    overflow: 'hidden',
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
    fontSize: 42,
  },
  zeroSugarBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  zeroSugarText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.3,
  },
  content: {
    paddingTop: spacing.sm,
  },
  categoryName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.text,
    minHeight: 34,
    marginTop: 2,
  },
  sizeIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  sizeIndicatorText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  discountFloatingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  discountFloatingText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.3,
  },
  priceContainer: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.text,
  },
  originalPrice: {
    fontSize: 10,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    fontWeight: '700',
  },
  offerTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  addButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 2,
    paddingVertical: 3,
    gap: 4,
  },
  stepperButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.white,
    minWidth: 12,
    textAlign: 'center',
  },
  customizedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  customizedQtyText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
  },
});
