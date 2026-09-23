import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { colors, spacing, radius, fontSize } from '../../theme';
import api from '../../lib/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - spacing.lg * 2;

const PALETTES = [
  { bg: '#1B5E4B', accent: '#FDE047', emoji: '🍨' },
  { bg: '#0F766E', accent: '#6EE7B7', emoji: '🍧' },
  { bg: '#854D0E', accent: '#FBBF24', emoji: '🍦' },
  { bg: '#1E3A8A', accent: '#93C5FD', emoji: '🥭' },
];

const DEFAULT_BANNER = [
  {
    _id: 'default_1',
    title: 'Natural Artisan Ice Creams',
    discountPercent: null,
    subtitle: 'Crafted fresh in Mandya with 100% pure milk & real fruits',
    requirementText: 'Fresh Daily',
    bg: '#1B5E4B',
    accent: '#FDE047',
    emoji: '🍨',
  },
];

export default function BannerCarousel({ onBannerPress }) {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    fetchActiveOffers();
  }, []);

  const fetchActiveOffers = async () => {
    try {
      const res = await api.get('/offers/active');
      const activeOffers = res.data?.data || [];
      if (activeOffers.length > 0) {
        const mapped = activeOffers.map((o, idx) => {
          const pal = PALETTES[idx % PALETTES.length];
          return {
            _id: o._id,
            title: o.title,
            discountPercent: o.discountPercent,
            subtitle: o.category?.name ? `Special discount on ${o.category.name}` : 'Applicable storewide',
            requirementText: o.minOrderAmount > 0 ? `Orders above ₹${o.minOrderAmount}` : 'No minimum order',
            category: o.category,
            bg: pal.bg,
            accent: pal.accent,
            emoji: pal.emoji,
          };
        });
        setBanners(mapped);
      } else {
        setBanners(DEFAULT_BANNER);
      }
    } catch (e) {
      setBanners(DEFAULT_BANNER);
    }
  };

  const listToRender = banners.length > 0 ? banners : DEFAULT_BANNER;

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
            activeOpacity={0.9}
          >
            <View style={styles.textContainer}>
              <View style={[styles.tagBadge, { backgroundColor: banner.accent }]}>
                <Text style={styles.tagText}>
                  {banner.discountPercent ? `${banner.discountPercent}% OFF OFFER` : 'APSARA EXCLUSIVE'}
                </Text>
              </View>
              <Text style={styles.title}>{banner.title}</Text>
              <Text style={styles.subtitle}>{banner.subtitle}</Text>
              <View style={styles.codeRow}>
                <Text style={styles.codeLabel}>{banner.requirementText}</Text>
              </View>
            </View>

            <View style={styles.emojiContainer}>
              <Text style={styles.emoji}>{banner.emoji}</Text>
            </View>
          </TouchableOpacity>
        ))}
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
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  textContainer: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  tagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    color: colors.white,
    lineHeight: 22,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: '#E5E7EB',
    marginBottom: spacing.xs,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  emojiContainer: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 32,
  },
});
