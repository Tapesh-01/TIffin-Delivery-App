import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StatusBar, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, Radius } from '../../constants/theme';
import { api } from '../../lib/api';

const DEMO_RIDER = {
  id: 'demo-rider-1',
  name: 'Ramesh Kumar',
  phone: '9999999999',
  vehicle: 'DL 12 AB 3456',
};

interface LoginScreenProps {
  onLogin: (rider: any, token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'name' | 'phone' | 'pin' | 'vehicle' | null>(null);

  const handleLogin = async () => {
    if (phone.length < 10) {
      Alert.alert('❌ Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return;
    }
    if (pin.length !== 4) {
      Alert.alert('❌ Invalid PIN', 'Please enter your 4-digit PIN.');
      return;
    }
    setLoading(true);

    try {
      const { data } = await api.post('/auth/rider-login', {
        phone: phone,
        pin: pin
      });

      if (data.success) {
        onLogin(data.user, data.token);
      } else {
        Alert.alert('Login Failed', 'Wrong phone or PIN. Contact your manager.');
      }
    } catch (e: any) {
      Alert.alert('Login Failed', e.response?.data?.message || 'Wrong phone or PIN. Contact your manager.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name.trim()) {
      Alert.alert('❌ Invalid Name', 'Please enter your full name.');
      return;
    }
    if (phone.length < 10) {
      Alert.alert('❌ Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return;
    }
    if (pin.length !== 4) {
      Alert.alert('❌ Invalid PIN', 'Please enter a 4-digit PIN.');
      return;
    }
    setLoading(true);

    try {
      const { data } = await api.post('/auth/rider-signup', {
        name: name.trim(),
        phone: phone,
        pin: pin,
        vehicle: vehicle.trim()
      });

      if (data.success) {
        Alert.alert('🎉 Registration Successful', `Welcome, ${data.user.name}!`);
        onLogin(data.user, data.token);
      } else {
        Alert.alert('Registration Failed', 'Could not register rider.');
      }
    } catch (e: any) {
      Alert.alert('Registration Failed', e.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#EF4444" />
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── TOP RED BRAND HERO ── */}
        <LinearGradient
          colors={['#EF4444', '#DC2626', '#B91C1C']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Subtle abstract background graphics */}
          <View style={styles.deco1} />
          <View style={styles.deco2} />

          <View style={styles.logoWrapper}>
            <View style={styles.logoOuter}>
              <View style={styles.logoBox}>
                <Text style={styles.logoEmoji}>🛵</Text>
              </View>
            </View>
          </View>
          <Text style={styles.brandName}>Tiffin Rider</Text>
          <Text style={styles.brandTagline}>Delivery Partner Network</Text>

          {/* Value proposition badges */}
          <View style={styles.pillsRow}>
            {['⚡ Real-Time Tracking', '📍 Live GPS Sync', '💰 Fast Payouts'].map(p => (
              <View key={p} style={styles.pill}>
                <Text style={styles.pillText}>{p}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── INTERACTIVE WHITE CARD ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{isSignUp ? 'Rider Registration 📝' : 'Welcome Back 👋'}</Text>
            <Text style={styles.cardSub}>
              {isSignUp ? 'Onboard as a delivery partner' : 'Access your dashboard & go online'}
            </Text>
          </View>

          {/* Full Name field (Registration Mode only) */}
          {isSignUp && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>FULL NAME</Text>
              <View style={[styles.inputFieldRow, focused === 'name' && styles.fieldFocused]}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="E.g. Ramesh Kumar"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                />
              </View>
            </View>
          )}

          {/* Phone number field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <View style={[styles.inputFieldRow, focused === 'phone' && styles.fieldFocused]}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixTxt}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="9876543210"
                placeholderTextColor={Colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                onFocus={() => setFocused('phone')}
                onBlur={() => setFocused(null)}
              />
            </View>
          </View>

          {/* Secure 4-Digit Login PIN field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>4-DIGIT LOGIN PIN</Text>
            <View style={[styles.inputFieldRow, focused === 'pin' && styles.fieldFocused]}>
              <Text style={styles.inputIcon}>🔑</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter 4-digit PIN"
                placeholderTextColor={Colors.textMuted}
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                onFocus={() => setFocused('pin')}
                onBlur={() => setFocused(null)}
              />
            </View>
          </View>

          {/* Vehicle Number field (Registration Mode only) */}
          {isSignUp && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>VEHICLE REGISTRATION NUMBER</Text>
              <View style={[styles.inputFieldRow, focused === 'vehicle' && styles.fieldFocused]}>
                <Text style={styles.inputIcon}>🛵</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="E.g. DL 12 AB 3456"
                  placeholderTextColor={Colors.textMuted}
                  value={vehicle}
                  onChangeText={setVehicle}
                  autoCapitalize="characters"
                  onFocus={() => setFocused('vehicle')}
                  onBlur={() => setFocused(null)}
                />
              </View>
            </View>
          )}

          {/* Action button */}
          <TouchableOpacity
            onPress={isSignUp ? handleSignup : handleLogin}
            disabled={loading}
            activeOpacity={0.88}
            style={styles.actionBtnContainer}
          >
            <LinearGradient
              colors={['#EF4444', '#F97316']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.loginBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnTxt}>
                  {isSignUp ? 'Onboard & Start Earning 🛵' : 'Go Online Now  →'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Form Switch Trigger */}
          <TouchableOpacity 
            onPress={() => {
              setIsSignUp(!isSignUp);
              setName('');
              setVehicle('');
              setPhone('');
              setPin('');
            }} 
            style={styles.switchButton}
          >
            <Text style={styles.switchBtnTxt}>
              {isSignUp ? "Already registered? Login Here" : "New Delivery Partner? Register Here"}
            </Text>
          </TouchableOpacity>

          {/* Professional Support Banner */}
          <View style={styles.supportContainer}>
            <Text style={styles.supportTxt}>
              🔒 PIN codes are securely encrypted. For verification issues or credentials reset requests, please contact your Hub Manager.
            </Text>
          </View>

          {/* Bottom network metrics */}
          <View style={styles.statsRow}>
            {[
              { icon: '🚀', label: 'Today\'s Orders', val: 'Active' },
              { icon: '📍', label: 'Live GPS Ping', val: 'Syncing' },
              { icon: '🛡️', label: 'Compliance', val: 'Verified' },
            ].map((s, i) => (
              <View key={i} style={[styles.statBox, i < 2 && { borderRightWidth: 1, borderRightColor: Colors.surfaceBorder }]}>
                <Text style={styles.statIconEmoji}>{s.icon}</Text>
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Hero Section
  hero: {
    paddingTop: 80, 
    paddingBottom: 48, 
    paddingHorizontal: Spacing.lg,
    alignItems: 'center', 
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  deco1: {
    position: 'absolute', 
    top: -50, 
    right: -50,
    width: 200, 
    height: 200, 
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  deco2: {
    position: 'absolute', 
    bottom: -30, 
    left: -40,
    width: 140, 
    height: 140, 
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  logoWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 16,
  },
  logoOuter: {
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 50,
  },
  logoBox: {
    width: 80, 
    height: 80, 
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', 
    justifyContent: 'center',
  },
  logoEmoji: { 
    fontSize: 40 
  },
  brandName: { 
    fontSize: 32, 
    fontWeight: '900', 
    color: '#fff', 
    letterSpacing: -0.5 
  },
  brandTagline: { 
    fontSize: 13, 
    color: 'rgba(255,255,255,0.85)', 
    marginTop: 4, 
    marginBottom: 20,
    fontWeight: '500'
  },
  pillsRow: { 
    flexDirection: 'row', 
    gap: 8, 
    flexWrap: 'wrap', 
    justifyContent: 'center' 
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.16)', 
    borderRadius: Radius.full,
    paddingHorizontal: 12, 
    paddingVertical: 6,
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pillText: { 
    fontSize: 11, 
    color: '#fff', 
    fontWeight: '700' 
  },

  // Card Content Area
  card: {
    backgroundColor: Colors.surface, 
    borderRadius: 28,
    marginHorizontal: 16,
    marginTop: -24, 
    padding: 24,
    shadowColor: '#0F172A', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 20, 
    elevation: 10,
    marginBottom: 24,
  },
  cardHeader: {
    marginBottom: 24,
  },
  cardTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: Colors.textPrimary, 
    marginBottom: 4 
  },
  cardSub: { 
    fontSize: 13, 
    color: Colors.textMuted 
  },

  // Fields and Labels
  inputContainer: {
    marginBottom: 16,
    width: '100%',
  },
  label: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: Colors.textSecondary, 
    letterSpacing: 0.8, 
    marginBottom: 8 
  },
  inputFieldRow: {
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#F8FAFC', 
    borderRadius: 14,
    borderWidth: 1.5, 
    borderColor: '#E2E8F0', 
    overflow: 'hidden',
  },
  fieldFocused: { 
    borderColor: '#EF4444', 
    backgroundColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  inputIcon: {
    fontSize: 18,
    marginLeft: 16,
    color: Colors.textSecondary,
  },
  phonePrefix: {
    paddingLeft: 16, 
    paddingRight: 10,
    justifyContent: 'center',
  },
  phonePrefixTxt: { 
    color: Colors.textPrimary, 
    fontWeight: '700', 
    fontSize: 14 
  },
  textInput: {
    flex: 1, 
    paddingHorizontal: 14, 
    paddingVertical: 14,
    color: Colors.textPrimary, 
    fontSize: 15,
    fontWeight: '500',
  },

  // Button Styles
  actionBtnContainer: { 
    borderRadius: 14, 
    overflow: 'hidden', 
    marginTop: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtn: { 
    paddingVertical: 16, 
    alignItems: 'center' 
  },
  loginBtnTxt: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '800', 
    letterSpacing: 0.3 
  },

  // Form toggles
  switchButton: { 
    marginTop: 18,
    paddingVertical: 4,
  },
  switchBtnTxt: { 
    textAlign: 'center', 
    color: Colors.primary, 
    fontWeight: '700', 
    fontSize: 14 
  },

  // Support & Compliance Info Box
  supportContainer: {
    backgroundColor: '#F8FAFC', 
    borderRadius: 12,
    padding: 12, 
    marginTop: 20, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
  },
  supportTxt: { 
    color: Colors.textSecondary, 
    fontSize: 11, 
    textAlign: 'center', 
    lineHeight: 16,
    fontWeight: '500'
  },

  // Bottom stats row
  statsRow: {
    flexDirection: 'row', 
    marginTop: 24, 
    borderWidth: 1,
    borderColor: Colors.surfaceBorder, 
    borderRadius: 16, 
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  statBox: { 
    flex: 1, 
    alignItems: 'center', 
    paddingVertical: 14, 
    gap: 3 
  },
  statIconEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  statVal: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: Colors.primary,
    textTransform: 'uppercase'
  },
  statLabel: { 
    fontSize: 10, 
    color: Colors.textMuted, 
    textAlign: 'center' 
  },
});
