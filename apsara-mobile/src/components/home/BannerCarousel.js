import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../theme';
import api from '../../lib/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - spacing.lg * 2;
const AUTO_SCROLL_INTERVAL = 4500;

const STATIC_THEMATIC_BANNERS = [
  {
    _id: 'story_purity',
    tag: '🥛 100% PURE MILK',
    title: 'Artisan Fresh Scoops',
    subtitle: 'Crafted with 100% pure cow milk & real seasonal fruits',
    requirementText: 'Fresh Daily in Mandya',
    ctaText: 'EXPLORE SCOOPS',
    bg: '#053E2F',
    tagBg: '#059669',
    accent: '#FDE047',
    glowColor: 'rgba(245, 158, 11, 0.32)',
    haloColor: 'rgba(254, 240, 138, 0.42)',
    imageUrl: 'https://res.cloudinary.com/dolzqp0pj/image/upload/v1790956965/apsara_menu/ice_creams/Asli_Alphonso_Mango_Ice_Cream_m5uczq.jpg',
  },
  {
    _id: 'story_health',
    tag: '🌱 0% ADDED SUGAR',
    title: 'Zero Sugar Delights',
    subtitle: 'Guilt-free natural sweetness from pure figs & berries',
    requirementText: 'Naturally Sweetened',
    ctaText: 'VIEW ZERO SUGAR',
    bg: '#0D5F59',
    tagBg: '#0D9488',
    accent: '#FEF08A',
    glowColor: 'rgba(52, 211, 153, 0.32)',
    haloColor: 'rgba(167, 243, 208, 0.42)',
    imageUrl: 'https://res.cloudinary.com/dolzqp0pj/image/upload/v1790957007/apsara_menu/zero_added_sugar/Anjeer_Andaaz_Ice_Cream_itmx93.jpg',
    code: 'ZEROSUGAR',
  },
  {
    _id: 'story_heritage',
    tag: '🍨 SINCE 1971',
    title: 'Handcrafted Heritage',
    subtitle: 'Old-school slow churned recipes with rich Belgian cocoa',
    requirementText: 'Original Apsara Legacy',
    ctaText: 'VIEW ALL FLAVOURS',
    bg: '#1B172B',
    tagBg: '#3B3355',
    accent: '#FDE047',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    haloColor: 'rgba(253, 224, 71, 0.4)',
    imageUrl: 'https://res.cloudinary.com/dolzqp0pj/image/upload/v1790956966/apsara_menu/ice_creams/Belgian_Bite_Chocolate_Ice_Cream_wnxqju.jpg',
  },
];

const OFFER_FALLBACK_IMAGES = [
  'https://res.cloudinary.com/dolzqp0pj/image/upload/v1790957003/apsara_menu/sundaes/Death_By_Chocolate_Sundae_vatb3k.jpg',
  'https://res.cloudinary.com/dolzqp0pj/image/upload/v1790956965/apsara_menu/ice_creams/Asli_Alphonso_Mango_Ice_Cream_m5uczq.jpg',
  'https://res.cloudinary.com/dolzqp0pj/image/upload/v1790956968/apsara_menu/ice_creams/Brownie_Blast_Chocolate_Ice_Cream_w6lgyi.jpg',
];

const mapOffersToBanners = (offersList = []) => {
  if (!offersList || offersList.length === 0) {
    return STATIC_THEMATIC_BANNERS;
  }

  const offerBanners = offersList.map((o, idx) => {
    const catId = o.category?._id || (typeof o.category === 'string' ? o.category : null);
    const catImg = o.category?.imageUrl;
    const fallbackImg = OFFER_FALLBACK_IMAGES[idx % OFFER_FALLBACK_IMAGES.length];
    const imageToUse = catImg && catImg.trim() !== '' ? catImg : fallbackImg;

    return {
      _id: o._id,
      tag: `✨ ${o.discountPercent}% OFF SPECIAL`,
      title: o.title,
      subtitle: o.description && o.description.trim() !== ''
        ? o.description
        : o.category?.name
        ? `Special savings on ${o.category.name}`
        : 'Limited-time deal on freshly churned scoops',
      requirementText: o.minOrderAmount > 0 ? `Orders above ₹${o.minOrderAmount}` : 'Limited time deal',
      ctaText: 'ORDER NOW',
      bg: '#064E3B',
      tagBg: '#10B981',
      accent: '#FDE047',
      glowColor: 'rgba(253, 224, 71, 0.35)',
      haloColor: 'rgba(254, 240, 138, 0.45)',
      imageUrl: imageToUse,
      category: o.category,
      categoryId: catId,
      discountPercent: o.discountPercent,
      isOffer: true,
    };
  });

  return [...offerBanners, ...STATIC_THEMATIC_BANNERS];
};

export default function BannerCarousel({ offers, onBannerPress }) {
  const [internalBanners, setInternalBanners] = useState(() => {
    if (offers !== undefined && offers !== null) {
      return mapOffersToBanners(offers);
    }
    return STATIC_THEMATIC_BANNERS;
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);
  const isInteractingRef = useRef(false);

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
      setInternalBanners(STATIC_THEMATIC_BANNERS);
    }
  };

  const listToRender = internalBanners.length > 0 ? internalBanners : STATIC_THEMATIC_BANNERS;

  useEffect(() => {
    if (listToRender.length <= 1) return;

    const interval = setInterval(() => {
      if (isInteractingRef.current) return;
      const nextIndex = (activeIndex + 1) % listToRender.length;
      scrollRef.current?.scrollTo({
        x: nextIndex * (CARD_WIDTH + spacing.md),
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(interval);
  }, [activeIndex, listToRender.length]);

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / (CARD_WIDTH + spacing.md));
    if (newIndex >= 0 && newIndex < listToRender.length && newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + spacing.md}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          isInteractingRef.current = true;
        }}
        onScrollEndDrag={() => {
          isInteractingRef.current = false;
        }}
        onMomentumScrollEnd={() => {
          isInteractingRef.current = false;
        }}
        contentContainerStyle={styles.scrollContent}
      >
        {listToRender.map((banner) => (
          <TouchableOpacity
            key={banner._id}
            style={[styles.card, { backgroundColor: banner.bg }]}
            onPress={() => onBannerPress?.(banner)}
            activeOpacity={0.92}
          >
            <Image
              source={{ uri: banner.imageUrl }}
              style={styles.atmosphericBackdrop}
              blurRadius={24}
              resizeMode="cover"
            />

            <View
              style={[
                styles.ambientGlowOrb,
                { backgroundColor: banner.glowColor || 'rgba(253, 224, 71, 0.28)' },
              ]}
            />

            <View style={styles.cardContent}>
              <View style={styles.leftCol}>
                <View style={[styles.brandPill, { backgroundColor: banner.tagBg }]}>
                  <Text style={styles.brandPillText}>{banner.tag}</Text>
                </View>

                <Text style={styles.title} numberOfLines={2}>
                  {banner.title}
                </Text>

                <Text style={styles.subtitle} numberOfLines={2}>
                  {banner.subtitle}
                </Text>

                <View style={[styles.ctaButton, { backgroundColor: banner.accent }]}>
                  <Text style={styles.ctaButtonText}>{banner.ctaText || 'ORDER NOW'}</Text>
                  <Ionicons name="arrow-forward" size={12} color="#111827" />
                </View>
              </View>

              <View style={styles.rightCol}>
                <View style={[styles.spotlightHalo, { borderColor: banner.haloColor }]}>
                  <View style={styles.spotlightPlate} />
                  <Image
                    source={{ uri: banner.imageUrl }}
                    style={styles.spotlightProductImg}
                    resizeMode="cover"
                  />
                </View>

                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText} numberOfLines={2}>
                    {banner.requirementText}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {listToRender.length > 1 && (
        <View style={styles.paginationRow}>
          {listToRender.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 24,
    marginRight: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    minHeight: 156,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  atmosphericBackdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
    transform: [{ scale: 1.6 }],
  },
  ambientGlowOrb: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 170,
    height: 170,
    borderRadius: 85,
  },
  cardContent: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 2,
  },
  leftCol: {
    flex: 1,
    paddingRight: spacing.md,
    justifyContent: 'center',
  },
  brandPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: radius.full,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  brandPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: fontSize.md + 3,
    fontWeight: '900',
    color: colors.white,
    lineHeight: 23,
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.92)',
    lineHeight: 16.5,
    fontWeight: '500',
    marginBottom: 11,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaButtonText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.6,
  },
  rightCol: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 104,
  },
  spotlightHalo: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    position: 'relative',
    marginBottom: 6,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  spotlightPlate: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 47,
  },
  spotlightProductImg: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  badgeContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgeText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: 96,
    lineHeight: 12,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 11,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 5,
    backgroundColor: '#CBD5E1',
  },
});
