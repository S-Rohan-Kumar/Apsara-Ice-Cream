import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../theme';
import { useCart } from '../../contexts/CartContext';
import { optimizeCloudinaryUrl } from '../../lib/productImageCache';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ProductDetailModal({ visible, product, onClose, onOpenVariants }) {
  const { getProductTotalQuantity, getItemQuantity, addToCart, decrementItem, items } = useCart();
  const [activeProduct, setActiveProduct] = useState(product);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT * 0.75)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const onOpenVariantsRef = useRef(onOpenVariants);
  onOpenVariantsRef.current = onOpenVariants;

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT * 0.75,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      isClosingRef.current = false;
      if (onCloseRef.current) onCloseRef.current();
    });
  }, [backdropAnim, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.2,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          slideAnim.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 80 || gesture.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 9,
            tension: 75,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible && product) {
      setActiveProduct(product);
      isClosingRef.current = false;
      slideAnim.setValue(SCREEN_HEIGHT * 0.75);
      backdropAnim.setValue(0);

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 75,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, product?._id, slideAnim, backdropAnim]);

  if (!visible && !isClosingRef.current) return null;

  const currentProduct = activeProduct || product || {};
  const isAvailable = currentProduct.isAvailable !== false;
  const isIceCream = currentProduct.category?.productType === 'icecream';
  const totalQty = isIceCream
    ? getProductTotalQuantity(currentProduct._id)
    : getItemQuantity(currentProduct._id, 'regular');

  const regularBase = isIceCream
    ? currentProduct.basePrices?.small || currentProduct.basePrices?.regular || currentProduct.priceOverride?.regular || currentProduct.category?.basePrice?.regular || 0
    : currentProduct.basePrices?.regular || currentProduct.priceOverride?.regular || currentProduct.category?.basePrice?.regular || 0;

  const regularResolved = isIceCream
    ? currentProduct.resolvedPrices?.small || currentProduct.resolvedPrices?.regular || 0
    : currentProduct.resolvedPrices?.regular || 0;

  const effectiveBasePrice = regularBase > 0 ? regularBase : regularResolved;
  const hasDiscount = Boolean(currentProduct.appliedOffer && regularBase > regularResolved);

  const handleAddPress = () => {
    if (!isAvailable) return;
    if (isIceCream) {
      handleClose();
      if (onOpenVariantsRef.current) onOpenVariantsRef.current(currentProduct);
    } else {
      addToCart(currentProduct, 'regular', effectiveBasePrice);
    }
  };

  const handleDecrement = () => {
    if (isIceCream) {
      const existing = (items || []).filter((i) => i.productId === currentProduct._id);
      if (existing.length > 1) {
        handleClose();
        if (onOpenVariantsRef.current) onOpenVariantsRef.current(currentProduct);
        return;
      }
      if (existing.length === 1) {
        decrementItem(currentProduct._id, existing[0].variant);
        return;
      }
    }
    decrementItem(currentProduct._id, 'regular');
  };

  const handleIncrement = () => {
    if (!isAvailable) return;
    if (isIceCream) {
      const existing = (items || []).filter((i) => i.productId === currentProduct._id);
      if (existing.length === 1) {
        addToCart(currentProduct, existing[0].variant, existing[0].price);
        return;
      }
      handleClose();
      if (onOpenVariantsRef.current) onOpenVariantsRef.current(currentProduct);
      return;
    }
    addToCart(currentProduct, 'regular', effectiveBasePrice);
  };

  const defaultDescription = isIceCream
    ? 'Crafted with 100% natural ingredients, fresh dairy cream, and pure fruit pulp for an authentic rich scoop.'
    : 'Delicious handcrafted dessert made with rich ingredients and authentic traditional recipes.';

  const descriptionText =
    currentProduct.description && currentProduct.description.trim() !== ''
      ? currentProduct.description
      : defaultDescription;

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
      hardwareAccelerated={true}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetWrapper,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Animated.View style={[styles.floatingCloseWrap, { opacity: backdropAnim }]}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.floatingCloseBtn}
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color={colors.white} />
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.sheetContainer}>
            <View style={styles.topHandleBar} {...panResponder.panHandlers}>
              <View style={styles.dragPill} />
            </View>

            <View style={styles.imageWrap} {...panResponder.panHandlers}>
              {currentProduct.imageUrl ? (
                <Image
                  source={{ uri: optimizeCloudinaryUrl(currentProduct.imageUrl, 600) }}
                  style={styles.productImage}
                  resizeMode="contain"
                  fadeDuration={0}
                />
              ) : (
                <View style={styles.placeholderBox}>
                  <Text style={styles.placeholderEmoji}>🍨</Text>
                </View>
              )}
            </View>

            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentPadding}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.headerRow}>
                <View style={styles.titleCol}>
                  <Text style={styles.productName}>{currentProduct.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}>
                      ₹{(!currentProduct.appliedOffer?.minOrderAmount || currentProduct.appliedOffer?.minOrderAmount === 0) && hasDiscount ? regularResolved : effectiveBasePrice}
                    </Text>
                    {hasDiscount && (!currentProduct.appliedOffer?.minOrderAmount || currentProduct.appliedOffer?.minOrderAmount === 0) && (
                      <Text style={styles.strikethroughPrice}>₹{effectiveBasePrice}</Text>
                    )}
                    {isIceCream && (
                      <View style={styles.startingBadge}>
                        <Text style={styles.startingAtText}>Starting price</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.actionCol}>
                  {!isAvailable ? (
                    <View style={styles.outOfStockPill}>
                      <Text style={styles.outOfStockText}>Sold Out</Text>
                    </View>
                  ) : totalQty > 0 ? (
                    <View style={styles.stepperPill}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={handleDecrement}
                      >
                        <Ionicons name="remove" size={16} color="#EC4899" />
                      </TouchableOpacity>
                      <Text style={styles.stepperNumber}>{totalQty}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={handleIncrement}
                      >
                        <Ionicons name="add" size={16} color="#EC4899" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={handleAddPress}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.addBtnText}>ADD</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.descSection}>
                <Text style={styles.descHeading}>Taste & Ingredients</Text>
                <Text style={styles.descText}>{descriptionText}</Text>
                {Boolean(currentProduct.nutritionInfo) && (
                  <View style={styles.nutritionBox}>
                    <View style={styles.nutritionBadgeRow}>
                      <Text style={styles.nutritionBadgeIcon}>🌱</Text>
                      <Text style={styles.nutritionBadgeTitle}>Nutrition & Allergens</Text>
                    </View>
                    <Text style={styles.nutritionText}>{currentProduct.nutritionInfo}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
  },
  sheetWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  floatingCloseWrap: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  floatingCloseBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(30, 41, 59, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  sheetContainer: {
    width: '100%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: Math.round(SCREEN_HEIGHT * 0.82),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
  },
  topHandleBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  dragPill: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
  },
  imageWrap: {
    width: '100%',
    height: 215,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 6,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  contentScroll: {
    flexGrow: 0,
  },
  contentPadding: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleCol: {
    flex: 1,
  },
  productName: {
    fontSize: fontSize.md + 3,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  priceText: {
    fontSize: fontSize.md + 1,
    fontWeight: '900',
    color: colors.primary,
  },
  strikethroughPrice: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  startingBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  startingAtText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  actionCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  outOfStockPill: {
    height: 38,
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  outOfStockText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  addBtn: {
    minWidth: 88,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  customizedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  customizedText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FCE7F3',
    backgroundColor: '#FDF2F8',
    borderRadius: radius.md,
    height: 38,
    paddingHorizontal: 4,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperNumber: {
    fontSize: 13,
    fontWeight: '900',
    color: '#EC4899',
    minWidth: 22,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.md,
  },
  descSection: {
    paddingTop: 2,
  },
  descHeading: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  descText: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 21,
    fontWeight: '500',
  },
  nutritionBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  nutritionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  nutritionBadgeIcon: {
    fontSize: 13,
  },
  nutritionBadgeTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#334155',
  },
  nutritionText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16.5,
    fontWeight: '500',
  },
});
