import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, fontSize } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import api from '../lib/api';

export default function LoginModal() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { login, updateUser } = useAuth();
  const { updateLocation, address, addressType } = useLocation();

  const [step, setStep] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [testCode, setTestCode] = useState('');
  const [name, setName] = useState('');
  const [timer, setTimer] = useState(45);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = async () => {
    if (phoneNumber.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/send-otp', { phone: phoneNumber });
      const returnedOtp = res.data?.data?.testOtp;
      if (returnedOtp) {
        setTestCode(returnedOtp);
      }
      setStep('otp');
      setTimer(res.data?.data?.cooldown || 45);
      setOtp('');
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (inputCode = otp) => {
    const codeToVerify = inputCode.trim();
    if (codeToVerify.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the complete 6-digit verification code');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/verify-otp', {
        phone: phoneNumber,
        otp: codeToVerify,
      });

      const { accessToken, user, isNewUser } = res.data?.data || {};
      if (accessToken && user) {
        await login(accessToken, user);
        await updateLocation(address, addressType, user.phone || ('+91' + phoneNumber));

        if (isNewUser || !user.name || user.name.trim() === '') {
          setStep('name');
        } else {
          navigation.goBack();
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      Alert.alert('Verification Failed', err.response?.data?.message || 'Could not verify OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name');
      return;
    }

    try {
      setLoading(true);
      await api.patch('/auth/update-profile', { name: name.trim() });
      await updateUser({ name: name.trim() });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Could not save name');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor={colors.white} translucent={false} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Login or Signup</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.brandIconContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>
          {step === 'name' ? 'Almost Done!' : 'Welcome to Apsara'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'phone'
            ? 'Enter your mobile number to get started with quick delivery'
            : step === 'otp'
            ? `Enter the 6-digit verification code sent to +91 ${phoneNumber}`
            : 'Enter your full name so our delivery partner can reach you'}
        </Text>

        {step === 'phone' ? (
          <View style={styles.form}>
            <View style={styles.phoneInputRow}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                autoFocus={true}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, phoneNumber.length < 10 && styles.disabledBtn]}
              onPress={handleSendOtp}
              disabled={phoneNumber.length < 10 || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Continue</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimerText}>
              By continuing, you agree to our Terms of Service & Privacy Policy
            </Text>
          </View>
        ) : step === 'otp' ? (
          <View style={styles.form}>
            {testCode ? (
              <TouchableOpacity
                style={styles.testOtpBadge}
                onPress={() => {
                  setOtp(testCode);
                  handleVerifyOtp(testCode);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.testOtpLabel}>⚡ Quick Fill Code: </Text>
                <Text style={styles.testOtpValue}>{testCode}</Text>
              </TouchableOpacity>
            ) : null}

            <TextInput
              style={styles.otpInput}
              placeholder="••••••"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(val) => {
                const clean = val.replace(/[^0-9]/g, '');
                setOtp(clean);
                if (clean.length === 6) {
                  handleVerifyOtp(clean);
                }
              }}
              autoFocus={true}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (otp.length < 6 || loading) && styles.disabledBtn]}
              onPress={() => handleVerifyOtp(otp)}
              disabled={otp.length < 6 || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Verify 6-Digit Code</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendRow}>
              {timer > 0 ? (
                <Text style={styles.timerText}>Resend code in {timer}s</Text>
              ) : (
                <TouchableOpacity onPress={handleSendOtp}>
                  <Text style={styles.resendText}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={() => setStep('phone')} style={styles.changeNumberBtn}>
              <Text style={styles.changeNumberText}>Edit Mobile Number</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <TextInput
              style={styles.nameInput}
              placeholder="Your Full Name (e.g. Rahul Sharma)"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus={true}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (!name.trim() || loading) && styles.disabledBtn]}
              onPress={handleSaveName}
              disabled={loading || !name.trim()}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Start Scooping 🍦</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  closeBtn: {
    padding: 4,
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
  },
  brandIconContainer: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  brandLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  form: {
    width: '100%',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 48,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  countryCodeBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    height: '100%',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  countryCodeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    height: '100%',
  },
  testOtpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F7F2',
    borderWidth: 1,
    borderColor: '#D8F3DC',
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
  },
  testOtpLabel: {
    fontSize: fontSize.xs,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  testOtpValue: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '900',
    letterSpacing: 2,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 52,
    textAlign: 'center',
    fontSize: fontSize.xl,
    fontWeight: '900',
    letterSpacing: 10,
    color: colors.text,
    marginBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  disclaimerText: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 14,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  timerText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  resendText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '800',
  },
  changeNumberBtn: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  changeNumberText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '700',
  },
});
