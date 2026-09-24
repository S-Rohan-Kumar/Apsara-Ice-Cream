import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../theme';

export default function LiveBroadcastBanner({ broadcast, onPress, onDismiss }) {
  if (!broadcast) return null;

  return (
    <View style={styles.floatingContainer}>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={onPress}
          activeOpacity={0.85}
        >
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>📢</Text>
          </View>

          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.badge}>NEW BROADCAST</Text>
              <Text style={styles.timeText}>Just now</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>{broadcast.title}</Text>
            <Text style={styles.body} numberOfLines={2}>{broadcast.body}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDismiss}
          style={styles.closeBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    top: 50,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#1B4332',
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  iconEmoji: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  badge: {
    fontSize: 9,
    fontWeight: '900',
    color: '#D8F3DC',
    letterSpacing: 0.8,
  },
  timeText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 2,
  },
  body: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
  },
  closeBtn: {
    padding: 6,
    marginLeft: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.full,
  },
});
