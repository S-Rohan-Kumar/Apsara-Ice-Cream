import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { colors, spacing, radius, fontSize } from '../../theme';
import api from '../../lib/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - spacing.lg * 2;

const PALETTES = [
  { bg: '#064E3B', accent: '#FDE047', tag: '#10B981', emoji: '🍨', starting: '₹69' },
  { bg: '#0F766E', accent: '#FEF08A', tag: '#14B8A6', emoji: '🥭', starting: '₹79' },
  { bg: '#1E3A8A', accent: '#FDE047', tag: '#3B82F6', emoji: '🍫', starting: '₹89' },
  { bg: '#701A75', accent: '#FDE047', tag: '#A855F7', emoji: '🍧', starting: '₹49' },
];

const DEFAULT_BANNERS = [
  {
    _id: 'default_1',
    title: 'Artisan Fresh Scoops',
    subtitle: 'Crafted with 100% pure milk & real seasonal fruits',
    requirementText: 'Fresh Daily in Mandya',
    bg: '#064E3B',
    accent: '#FDE047',
    tag: '#10B981',
    emoji: '🍨',
    starting: '₹69',
  },
  {
    _id: 'default_2',
    title: 'Zero Sugar Delights',
    subtitle: '100% Guilt-Free natural fruit sweetness',
    requirementText: 'Naturally Sweetened',
    bg: '#0F766E',
    accent: '#FEF08A',
    tag: '#14B8A6',
    emoji: '🍃',
    starting: '₹79',
  },
];

const mapOffersToBanners = (offersList = []) => {
  if (!offersList || offersList.length === 0) return DEFAULT_BANNERS;
  return offersList.map((o, idx) => {
    const pal = PALETTES[idx % PALETTES.length];
    const catId = o.category?._id || (typeof o.category === 'string' ? o.category : null);
    return {
      _id: o._id,
      title: o.title,
      discountPercent: o.discountPercent,
      subtitle: o.category?.name ? `Special on ${o.category.name}` : 'Made fresh with pure cow milk',
      requirementText: o.minOrderAmount > 0 ? `Orders above ₹${o.minOrderAmount}` : 'Limited time deal',
      category: o.category,
      categoryId: catId,
      bg: pal.bg,
      accent: pal.accent,
      tag: pal.tag,
      emoji: pal.emoji,
      starting: '₹49',
    };
  });
};

export default function BannerCarousel({ offers, onBannerPress }) {
  const [internalBanners, setInternalBanners] = useState(() => {
    if (offers !== undefined && offers !== null) {
      return mapOffersToBanners(offers);
    }
    return DEFAULT_BANNERS;
  });

  useEffect(() => {
    if (offers !== undefined && offers !== null) {
      setInternalBanners(mapOffersToBanners(offers));
    } else {
      fetchActiveOffers();
    }
  }, [offers]);

  const fetchActiveOffers = async () => {
    try {
      const res = await api.get('/offers/active');
      const activeOffers = res.data?.data || [];
      setInternalBanners(mapOffersToBanners(activeOffers));
    } catch (e) {
      setInternalBanners(DEFAULT_BANNERS);
    }
  };

  const listToRender = internalBanners.length > 0 ? internalBanners : DEFAULT_BANNERS;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + spacing.md}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {listToRender.map((banner) => (
          <TouchableOpacity
            key={banner._id}
            style={[styles.card, { backgroundColor: banner.bg }]}
            onPress={() => onBannerPress?.(banner)}
            activeOpacity={0.92}
          >
            <View style={styles.leftCol}>
              <View style={[styles.brandPill, { backgroundColor: banner.tag }]}>
                <Text style={styles.brandPillText}>
                  {banner.discountPercent ? `${banner.discountPercent}% OFF OFFER` : '100% NATURAL PURE'}
                </Text>
              </View>

              <Text style={styles.title} numberOfLines={2}>
                {banner.title}
              </Text>

              <Text style={styles.startingText}>
                Starting at <Text style={styles.startingPrice}>{banner.starting || '₹49'}</Text>
              </Text>

              <View style={[styles.ctaButton, { backgroundColor: banner.accent }]}>
                <Text style={styles.ctaButtonText}>ORDER NOW</Text>
              </View>
            </View>

            <View style={styles.rightCol}>
              <View style={styles.emojiCircle}>
                <Text style={styles.emojiText}>{banner.emoji}</Text>
              </View>
              <Text style={styles.badgeText}>{banner.requirementText}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    minHeight: 140,
  },
  leftCol: {
    flex: 1,
    paddingRight: spacing.sm,
    justifyContent: 'center',
  },
  brandPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radius.sm,
    marginBottom: 6,
  },
  brandPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    color: colors.white,
    lineHeight: 22,
    marginBottom: 4,
  },
  startingText: {
    fontSize: fontSize.xs,
    color: '#D1FAE5',
    fontWeight: '700',
    marginBottom: 8,
  },
  startingPrice: {
    fontSize: fontSize.sm,
    fontWeight: '900',
    color: '#FEF08A',
  },
  ctaButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  ctaButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.5,
  },
  rightCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiCircle: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emojiText: {
    fontSize: 38,
  },
  badgeText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 80,
  },
});
