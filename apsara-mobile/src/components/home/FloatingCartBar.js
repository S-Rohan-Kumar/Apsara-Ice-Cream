import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../theme';
import { useCart } from '../../contexts/CartContext';

export default function FloatingCartBar({ onPress }) {
  const { itemCount, grandTotal } = useCart();

  if (itemCount === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.bar}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.left}>
          <View style={styles.iconContainer}>
            <Ionicons name="cart" size={18} color={colors.white} />
          </View>
          <View>
            <Text style={styles.itemsCountText}>{itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'}</Text>
            <Text style={styles.totalText}>₹{grandTotal}</Text>
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.viewCartText}>View Cart</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.white} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 99,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },
  totalText: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.white,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCartText: {
    fontSize: fontSize.sm,
    fontWeight: '900',
    color: colors.white,
  },
});
