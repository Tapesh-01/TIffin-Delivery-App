import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { Button } from '../ui/Button';
import { User } from '../../navigation/AppNavigator';
import { api } from '../../lib/api';

const { height } = Dimensions.get('window');

interface LoginScreenProps {
  onLogin: (user: User, token: string, isNewUser?: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stage, setStage] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState('');
  const [receivedOtp, setReceivedOtp] = useState('');

  const cardY = useSharedValue(50);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    cardY.value = withSpring(0, { damping: 15 });
    cardOpacity.value = withTiming(1, { duration: 600 });
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }],
    opacity: cardOpacity.value,
  }));

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      setError('Please enter a 10-digit mobile number');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/send-otp', { phone });
      if (data.success) {
        setReceivedOtp(data.otp);
        Alert.alert(
          '🔑 Test Mode OTP Code',
          `Your sandbox verification code (OTP) is: ${data.otp}\n\n(You can use this OTP to complete the verification details)`,
          [{ text: 'Copy & Continue', onPress: () => setStage('otp') }]
        );
      } else {
        setError(data.message || 'Failed to send OTP.');
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/phone-login', { phone, otp });
      
      if (data.success) {
        if (data.user.role === 'student') {
          onLogin(data.user, data.token, data.isNewUser);
        } else {
          setError('Only student accounts are allowed to log in.');
        }
      } else {
        setError(data.message || 'OTP verification failed.');
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Incorrect OTP code. Please check your verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={[Colors.gradient.start, Colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />

        <View style={styles.headerContent}>
          <Text style={styles.mascot}>🍱</Text>
          <Text style={styles.brandName}>Student Tiffin</Text>
          <Text style={styles.tagline}>Healthy Meals Delivered</Text>
        </View>
      </LinearGradient>

      {/* Login Card */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.card, cardStyle]}>
            {stage === 'phone' ? (
              <View>
                <Text style={styles.cardTitle}>Welcome Back! 👋</Text>
                <Text style={styles.cardSubtitle}>
                  Enter your mobile number to get started (Sandbox Mode)
                </Text>

                {/* Phone Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>📞</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="10-Digit Mobile Number"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    maxLength={10}
                    value={phone}
                    onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={{ height: Spacing.xl }} />

                <Button
                  title="Continue"
                  onPress={handleSendOTP}
                  loading={loading}
                  disabled={phone.length !== 10}
                />

                <Text style={styles.disclaimer}>
                  Enter a 10-digit number. A new account will be created automatically for first-time signups.
                </Text>
              </View>
            ) : (
              <View>
                <Text style={styles.cardTitle}>Verify Details 🛡️</Text>
                <Text style={styles.cardSubtitle}>We have sent a 6-digit OTP code to +91 {phone}</Text>

                {/* OTP Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>🔑</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="6-Digit Verification Code"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    maxLength={6}
                    value={otp}
                    onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={{ height: Spacing.xl }} />

                <Button
                  title="Verify & Log In"
                  onPress={handleVerifyOTP}
                  loading={loading}
                  disabled={otp.length !== 6}
                />

                <TouchableOpacity 
                  onPress={() => {
                    setStage('phone');
                    setOtp('');
                    setError('');
                  }}
                  style={{ marginTop: Spacing.md, alignItems: 'center' }}
                >
                  <Text style={{ color: Colors.primary, fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.fontSize.sm }}>
                    Edit Mobile Number
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleSendOTP}
                  style={{ marginTop: Spacing.sm, alignItems: 'center' }}
                >
                  <Text style={{ color: Colors.textSecondary, fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.xs }}>
                    Didn't receive code? Resend OTP
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Hidden reCAPTCHA verifier anchor for web login verification */}
      {Platform.OS === 'web' && (
        <View {...{ id: 'recaptcha-container' }} style={{ position: 'absolute', opacity: 0 }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: height * 0.42,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  circle1: { width: 280, height: 280, top: -80, right: -60 },
  circle2: { width: 200, height: 200, bottom: -60, left: -40 },
  headerContent: { alignItems: 'center', zIndex: 1 },
  mascot: { fontSize: 72, marginBottom: 8 },
  brandName: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.textOnPrimary,
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    letterSpacing: 1,
  },
  keyboardView: { flex: 1, marginTop: -30 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    minHeight: height * 0.6,
    ...Shadows.card,
  },
  cardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
  },
  inputIcon: { fontSize: 18, marginRight: 8 },
  inputField: {
    flex: 1,
    paddingVertical: 16,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.danger,
    marginTop: 8,
    textAlign: 'center'
  },
  disclaimer: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },
});
