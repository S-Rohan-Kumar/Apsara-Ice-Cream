import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, fontSize } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated, logout } = useAuth();
  const { address, addressType, phone, updateLocation, detectLocation, isLocating } = useLocation();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newAddress, setNewAddress] = useState(address);
  const [newType, setNewType] = useState(addressType);
  const [newPhone, setNewPhone] = useState(phone);

  const handleSaveAddress = async () => {
    await updateLocation(newAddress, newType, newPhone);
    setEditModalVisible(false);
    Alert.alert('Updated', 'Delivery details updated successfully');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Account</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {!isAuthenticated ? (
          <View style={styles.loginCard}>
            <View style={styles.loginCardIcon}>
              <Ionicons name="person-circle" size={48} color={colors.primary} />
            </View>
            <Text style={styles.loginCardTitle}>Log in to your account</Text>
            <Text style={styles.loginCardSubtitle}>
              Access your order history, manage delivery addresses, and track fresh orders in real time.
            </Text>
            <TouchableOpacity
              style={styles.fullLoginBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={styles.fullLoginBtnText}>Log In / Sign Up</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={32} color={colors.white} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.name || 'Apsara Customer'}
                </Text>
                <Text style={styles.profilePhone}>{user?.phone || phone}</Text>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Default Delivery Address</Text>
                <TouchableOpacity
                  onPress={() => {
                    setNewAddress(address);
                    setNewType(addressType);
                    setNewPhone(phone);
                    setEditModalVisible(true);
                  }}
                  style={styles.editBtn}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.addressBox}>
                <View style={styles.addressTypeBadge}>
                  <Text style={styles.addressTypeText}>{addressType}</Text>
                </View>
                <Text style={styles.addressFullText}>{address}</Text>
                <Text style={styles.addressPhoneText}>Phone: {phone}</Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About Apsara Ice Cream</Text>
          <Text style={styles.aboutDesc}>
            Apsara Ice Cream (Mandya Unit) brings you premium handcrafted ice creams made with 100% natural ingredients, fresh seasonal fruits, and pure dairy milk.
          </Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🥭</Text>
              <Text style={styles.featureText}>Real Fruits</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🥛</Text>
              <Text style={styles.featureText}>100% Pure Milk</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>💚</Text>
              <Text style={styles.featureText}>Zero Sugar Options</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>⚡</Text>
              <Text style={styles.featureText}>15-20 Min Delivery</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Customer Support</Text>
          <View style={styles.supportRow}>
            <Ionicons name="call-outline" size={18} color={colors.primary} />
            <Text style={styles.supportText}>Helpline: +91 98765 43210</Text>
          </View>
          <View style={styles.supportRow}>
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text style={styles.supportText}>support@apsaraicecream.com</Text>
          </View>
          <View style={styles.supportRow}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={styles.supportText}>Mandya Store, Karnataka</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Delivery Address</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={async () => {
                await detectLocation();
              }}
              disabled={isLocating}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: colors.primaryLight,
                borderWidth: 1,
                borderColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: 10,
                marginBottom: 12,
              }}
            >
              <Ionicons name="navigate-circle" size={18} color={colors.primaryDark} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primaryDark }}>
                {isLocating ? 'Detecting Location...' : 'Use My Current GPS Location'}
              </Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Label / Tag</Text>
              <View style={styles.tagRow}>
                {['Home', 'Work', 'Other'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.tagChip, newType === t && styles.activeTagChip]}
                    onPress={() => setNewType(t)}
                  >
                    <Text style={[styles.tagText, newType === t && styles.activeTagText]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Address</Text>
              <TextInput
                style={styles.textInput}
                value={newAddress}
                onChangeText={setNewAddress}
                multiline
                numberOfLines={3}
                placeholder="Flat / House No, Street, Landmark"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Phone</Text>
              <TextInput
                style={styles.singleInput}
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
                placeholder="+91 Mobile Number"
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAddress} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Save Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    color: colors.text,
  },
  scroll: {
    flex: 1,
    padding: spacing.md,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
  },
  profilePhone: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loginCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  loginCardIcon: {
    marginBottom: spacing.sm,
  },
  loginCardTitle: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 4,
  },
  loginCardSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  fullLoginBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    width: '100%',
    alignItems: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  fullLoginBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  loginBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  loginBtnText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.white,
  },
  logoutBtn: {
    padding: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  addressBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  addressTypeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  addressFullText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
  },
  addressPhoneText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  aboutDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featureItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  featureEmoji: {
    fontSize: 18,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  supportText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.text,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  activeTagChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeTagText: {
    color: colors.white,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.text,
    textAlignVertical: 'top',
  },
  singleInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 40,
    fontSize: fontSize.xs,
    color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
});
