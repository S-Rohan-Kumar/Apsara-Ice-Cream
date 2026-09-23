import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../theme';
import { useCart } from '../../contexts/CartContext';

const VARIANT_META = {
  small: { label: 'Small Scoop', ml: '80ml' },
  regular: { label: 'Regular Scoop', ml: '120ml' },
  large: { label: 'Large Scoop', ml: '160ml' },
  binge: { label: 'Binge Tub', ml: '300ml' },
  shareIt: { label: 'Share-It Tub', ml: '500ml' },
};

export default function VariantSelectorModal({ visible, product, onClose }) {
  const { getItemQuantity, addToCart, decrementItem } = useCart();

  if (!product) return null;

  const variants = ['small', 'regular', 'large', 'binge'];
  if (product.category?.hasShareIt) {
    variants.push('shareIt');
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
              <Text style={styles.subtitle}>Select Scoop or Tub Size</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {variants.map((v) => {
              const meta = VARIANT_META[v] || { label: v, ml: '' };
              const price = product.resolvedPrices?.[v] || 0;
              const basePrice = product.basePrices?.[v] || price;
              const hasDiscount = Boolean(product.appliedOffer && basePrice > price);
              const isAvailable = product.availableVariants?.[v] !== false;
              const showOfferBadge = Boolean(product.appliedOffer);
              const qty = getItemQuantity(product._id, v);

              return (
                <View
                  key={v}
                  style={[
                    styles.variantCard,
                    !isAvailable && styles.disabledCard,
                  ]}
                >
                  <View style={styles.variantInfo}>
                    <View style={styles.variantTitleRow}>
                      <Text style={[styles.variantLabel, !isAvailable && styles.disabledText]}>
                        {meta.label}
                      </Text>
                      {product.isZeroSugar && (
                        <View style={styles.zeroSugarBadge}>
                          <Text style={styles.zeroSugarText}>No Sugar</Text>
                        </View>
                      )}
                      {showOfferBadge && (
                        <View style={styles.offerBadge}>
                          <Text style={styles.offerBadgeText}>
                            {product.appliedOffer.discountPercent}% OFF
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.variantMl}>{meta.ml}</Text>
                    <View style={styles.priceRow}>
                      <Text style={[styles.variantPrice, !isAvailable && styles.disabledText]}>
                        ₹{price}
                      </Text>
                      {hasDiscount && (
                        <Text style={styles.variantOriginalPrice}>
                          ₹{basePrice}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.actionContainer}>
                    {!isAvailable ? (
                      <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>Out of Stock</Text>
                      </View>
                    ) : qty > 0 ? (
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity
                          style={styles.stepperButton}
                          onPress={() => decrementItem(product._id, v)}
                        >
                          <Ionicons name="remove" size={14} color={colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{qty}</Text>
                        <TouchableOpacity
                          style={styles.stepperButton}
                          onPress={() => addToCart(product, v, price)}
                        >
                          <Ionicons name="add" size={14} color={colors.white} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => addToCart(product, v, price)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.addButtonText}>ADD</Text>
                        <Ionicons name="add" size={14} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.doneButton} onPress={onClose} activeOpacity={0.9}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  productName: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  list: {
    marginTop: spacing.md,
  },
  variantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  disabledCard: {
    backgroundColor: colors.borderLight,
    opacity: 0.6,
  },
  variantInfo: {
    flex: 1,
  },
  variantTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  variantLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  zeroSugarBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  zeroSugarText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  offerBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  offerBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.3,
  },
  variantMl: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginTop: 3,
  },
  variantPrice: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.primary,
  },
  variantOriginalPrice: {
    fontSize: 10,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    fontWeight: '700',
  },
  disabledText: {
    color: colors.textMuted,
  },
  actionContainer: {
    marginLeft: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  addButtonText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.primary,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: spacing.sm,
  },
  stepperButton: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.white,
    minWidth: 14,
    textAlign: 'center',
  },
  outOfStockBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  doneButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
});
