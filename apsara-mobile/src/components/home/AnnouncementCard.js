import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../theme';

export default function AnnouncementCard({ announcement, onOpenAll, onDismiss }) {
  if (!announcement) return null;

  return (
    <View style={styles.container}>
      <View style={styles.leftAccent} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <Text style={styles.badgeEmoji}>📢</Text>
            <Text style={styles.badgeText}>STORE ANNOUNCEMENT</Text>
          </View>
          {onDismiss ? (
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity onPress={onOpenAll} activeOpacity={0.8}>
          <Text style={styles.title} numberOfLines={1}>{announcement.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{announcement.body}</Text>
          <View style={styles.viewMoreRow}>
            <Text style={styles.viewMoreText}>View details</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.primary} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: '#F2F7F2',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#D8F3DC',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  leftAccent: {
    width: 5,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  body: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  viewMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  viewMoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    marginRight: 3,
  },
});
