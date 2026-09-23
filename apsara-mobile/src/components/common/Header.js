import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../theme';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';

export default function Header({ onLocationPress, onProfilePress, onNotificationsPress, hasBroadcasts }) {
  const { address, addressType } = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <View style={styles.deliveryBadge}>
          <Ionicons name="flash" size={13} color="#FFFFFF" />
          <Text style={styles.deliveryText}>15-20 MINS</Text>
        </View>

        <TouchableOpacity
          style={styles.locationContainer}
          onPress={onLocationPress}
          activeOpacity={0.7}
        >
          <View style={styles.locationRow}>
            <Text style={styles.locationTitle}>{isAuthenticated ? addressType : 'Set Location'}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.text} style={styles.arrowIcon} />
          </View>
          <Text style={styles.locationSubtitle} numberOfLines={1}>
            {address || 'Set Delivery Location'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rightSection}>
        {onNotificationsPress ? (
          <TouchableOpacity
            style={styles.bellButton}
            onPress={onNotificationsPress}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {hasBroadcasts ? <View style={styles.notificationDot} /> : null}
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={isAuthenticated ? styles.profileButton : styles.loginPill}
          onPress={onProfilePress}
          activeOpacity={0.7}
        >
          {isAuthenticated ? (
            <Ionicons name="person-circle-outline" size={32} color={colors.primary} />
          ) : (
            <Text style={styles.loginPillText}>Log in</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
  },
  leftSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginBottom: 3,
  },
  deliveryText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginLeft: 3,
  },
  locationContainer: {
    justifyContent: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
  },
  arrowIcon: {
    marginLeft: 4,
    marginTop: 1,
  },
  locationSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellButton: {
    position: 'relative',
    padding: 6,
    marginRight: spacing.xs,
  },
  notificationDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E63946',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  profileButton: {
    padding: 2,
  },
  loginPill: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  loginPillText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.primary,
  },
});
