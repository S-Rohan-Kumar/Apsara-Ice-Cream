import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '../../theme';

const CATEGORY_META = {
  sundae: { emoji: '🍨', from: '₹149' },
  shake: { emoji: '🥤', from: '₹129' },
  milkshake: { emoji: '🥤', from: '₹129' },
  vegan: { emoji: '🌱', from: '₹69' },
  sorbet: { emoji: '🍋', from: '₹69' },
  popsicle: { emoji: '🍭', from: '₹69' },
  kulfi: { emoji: '🍧', from: '₹49' },
  zero: { emoji: '🍃', from: '₹79' },
  sugar: { emoji: '🍃', from: '₹79' },
  'ice cream': { emoji: '🍦', from: '₹69' },
  fruit: { emoji: '🥭', from: '₹69' },
  mango: { emoji: '🥭', from: '₹79' },
  chocolate: { emoji: '🍫', from: '₹89' },
  nut: { emoji: '🥜', from: '₹89' },
  almond: { emoji: '🥜', from: '₹89' },
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
          <View style={styles.imageWrapper}>
            <View style={[styles.avatarBox, styles.allAvatarBox, !selectedCategory && styles.avatarBoxActive]}>
              <Text style={styles.avatarEmoji}>🍨</Text>
            </View>
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
                <View style={[styles.avatarBox, isSelected && styles.avatarBoxActive]}>
                  {cat.imageUrl ? (
                    <Image source={{ uri: cat.imageUrl }} style={styles.categoryImage} resizeMode="cover" />
                  ) : (
                    <Text style={styles.avatarEmoji}>{meta.emoji}</Text>
                  )}
                </View>

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
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 18,
  },
  card: {
    alignItems: 'center',
    width: 72,
    paddingTop: 4,
  },
  cardActive: {
    transform: [{ scale: 1.04 }],
  },
  imageWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  avatarBox: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  avatarBoxActive: {
    borderColor: colors.primary,
    borderWidth: 2.5,
    backgroundColor: '#E8F5F1',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  allAvatarBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  avatarEmoji: {
    fontSize: 30,
  },
  fromBadge: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    backgroundColor: '#EC4899',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  fromBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.4,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    width: '100%',
  },
  categoryLabelActive: {
    color: colors.primary,
    fontWeight: '900',
  },
});
