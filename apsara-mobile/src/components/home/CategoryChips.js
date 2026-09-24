import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '../../theme';

const CATEGORY_META = {
  fruit: { emoji: '🥭', from: '₹69' },
  mango: { emoji: '🥭', from: '₹79' },
  kulfi: { emoji: '🍧', from: '₹49' },
  chocolate: { emoji: '🍫', from: '₹89' },
  zero: { emoji: '🍃', from: '₹79' },
  sugar: { emoji: '🍃', from: '₹79' },
  nut: { emoji: '🥜', from: '₹89' },
  almond: { emoji: '🥜', from: '₹89' },
  sorbet: { emoji: '🍋', from: '₹69' },
  tub: { emoji: '🍨', from: '₹149' },
  family: { emoji: '🍨', from: '₹199' },
  pack: { emoji: '🍨', from: '₹149' },
  cone: { emoji: '🍦', from: '₹59' },
  default: { emoji: '🍦', from: '₹59' },
};

function getCategoryMeta(name = '') {
  const lower = name.toLowerCase();
  for (const key of Object.keys(CATEGORY_META)) {
    if (key !== 'default' && lower.includes(key)) {
      return CATEGORY_META[key];
    }
  }
  return CATEGORY_META.default;
}

export default function CategoryChips({ categories = [], selectedCategory, onSelectCategory }) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={[
            styles.card,
            !selectedCategory && styles.cardActive,
          ]}
          onPress={() => onSelectCategory(null)}
          activeOpacity={0.8}
        >
          <View style={[styles.avatarBox, styles.allAvatarBox]}>
            <Text style={styles.avatarEmoji}>🍨</Text>
          </View>
          <Text
            style={[styles.categoryLabel, !selectedCategory && styles.categoryLabelActive]}
            numberOfLines={1}
          >
            All
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat._id;
          const meta = getCategoryMeta(cat.name);

          return (
            <TouchableOpacity
              key={cat._id}
              style={[
                styles.card,
                isSelected && styles.cardActive,
              ]}
              onPress={() => onSelectCategory(cat._id)}
              activeOpacity={0.8}
            >
              <View style={styles.imageWrapper}>
                {cat.imageUrl ? (
                  <Image source={{ uri: cat.imageUrl }} style={styles.categoryImage} resizeMode="cover" />
                ) : (
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarEmoji}>{meta.emoji}</Text>
                  </View>
                )}

                <View style={styles.fromBadge}>
                  <Text style={styles.fromBadgeText}>FROM {meta.from}</Text>
                </View>
              </View>

              <Text
                style={[styles.categoryLabel, isSelected && styles.categoryLabelActive]}
                numberOfLines={1}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    alignItems: 'center',
    width: 68,
  },
  cardActive: {
    transform: [{ scale: 1.04 }],
  },
  imageWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  allAvatarBox: {
    backgroundColor: '#E8F5F1',
    borderColor: '#A7F3D0',
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryImage: {
    width: 58,
    height: 58,
    borderRadius: 18,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  fromBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    backgroundColor: '#EC4899',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: radius.full,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  fromBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.3,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    width: '100%',
  },
  categoryLabelActive: {
    color: colors.primary,
    fontWeight: '900',
  },
});
