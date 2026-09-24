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
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={onLocationPress}
          activeOpacity={0.8}
        >
          <View style={styles.iconBadge}>
            <Ionicons name="home" size={18} color="#1B5E4B" />
          </View>
          <View style={styles.locationTextContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.locationTitle}>
                {isAuthenticated ? (addressType || 'My Home') : 'Select Location'}
              </Text>
              <Ionicons name="chevron-down" size={15} color={colors.white} style={styles.chevron} />
            </View>
            <Text style={styles.locationSubtitle} numberOfLines={1}>
              {address || 'Set Delivery Address'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          {onNotificationsPress ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onNotificationsPress}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.white} />
              {hasBroadcasts ? <View style={styles.notificationDot} /> : null}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.profileButton}
            onPress={onProfilePress}
            activeOpacity={0.8}
          >
            {isAuthenticated ? (
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={16} color={colors.primary} />
              </View>
            ) : (
              <View style={styles.loginBadge}>
                <Text style={styles.loginBadgeText}>Log in</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: '#FDE047',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  locationTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTitle: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.2,
  },
  chevron: {
    marginLeft: 4,
    marginTop: 1,
  },
  locationSubtitle: {
    fontSize: fontSize.xs,
    color: '#D1FAE5',
    marginTop: 1,
    fontWeight: '500',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  profileButton: {
    padding: 2,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  loginBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '900',
    color: colors.primary,
  },
});
