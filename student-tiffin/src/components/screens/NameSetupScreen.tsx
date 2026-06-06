import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { Button } from '../ui/Button';
import { User } from '../../navigation/AppNavigator';
import { api } from '../../lib/api';

const { height } = Dimensions.get('window');

interface NameSetupScreenProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

export const NameSetupScreen: React.FC<NameSetupScreenProps> = ({ user, onComplete }) => {
  const [name, setName] = useState(user.name && user.name !== 'New Student' ? user.name : '');
  const [gender, setGender] = useState(user.gender || '');
  const [addressLine, setAddressLine] = useState(user.addressLine || '');
  const [city, setCity] = useState(user.city || '');
  const [state, setState] = useState(user.state || '');
  const [pincode, setPincode] = useState(user.pincode || '');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!gender) {
      setError('Please select your gender');
      return;
    }
    if (!addressLine.trim()) {
      setError('Please enter your house/flat number and building');
      return;
    }
    if (!city.trim()) {
      setError('Please enter your city');
      return;
    }
    if (!state.trim()) {
      setError('Please enter your state');
      return;
    }
    if (!pincode.trim() || pincode.trim().length !== 6) {
      setError('Please enter a valid 6-digit pincode');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const payload: any = {
        name: name.trim(),
        addressLine: addressLine.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        gender: gender,
      };

      if (referralCode.trim()) {
        payload.referralCode = referralCode.trim();
      }

      const { data } = await api.put('/auth/profile', payload);
      if (data.success) {
        onComplete(data.user);
      } else {
        setError('Failed to update profile details');
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Error updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    name.trim().length > 0 &&
    gender !== '' &&
    addressLine.trim().length > 0 &&
    city.trim().length > 0 &&
    state.trim().length > 0 &&
    pincode.trim().length === 6;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header Banner */}
        <LinearGradient
          colors={[Colors.gradient.start, Colors.gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={styles.mascot}>✨</Text>
            <Text style={styles.brandName}>Welcome to Tiffin</Text>
            <Text style={styles.tagline}>Let's personalize your account</Text>
          </View>
        </LinearGradient>

        {/* Input Card */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.cardTitle}>Complete Your Profile 🍱</Text>
          <Text style={styles.cardSubtitle}>
            Enter your details and delivery address so we can route your hot meals perfectly.
          </Text>

          {/* Full Name */}
          <Text style={styles.inputLabel}>Full Name</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Your Name"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
              maxLength={40}
            />
          </View>

          <View style={{ height: Spacing.md }} />

          {/* Gender Selector */}
          <Text style={styles.inputLabel}>Gender</Text>
          <View style={styles.genderRow}>
            {['Male', 'Female', 'Other'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.genderChip,
                  gender === option && styles.genderChipSelected,
                ]}
                onPress={() => setGender(option)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === option && styles.genderTextSelected,
                  ]}
                >
                  {option === 'Male' && '🙋‍♂️ '}
                  {option === 'Female' && '🙋‍♀️ '}
                  {option === 'Other' && '👤 '}
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: Spacing.md }} />

          {/* Enter Delivery Address Section Header */}
          <Text style={styles.sectionHeader}>Enter Delivery Address</Text>

          {/* Address Line 1 */}
          <Text style={styles.inputLabel}>House No. / Flat / Building / Street</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>📍</Text>
            <TextInput
              style={styles.inputField}
              placeholder="e.g. Flat 302, Building 4-B, Campus area"
              placeholderTextColor={Colors.textMuted}
              value={addressLine}
              onChangeText={setAddressLine}
              maxLength={100}
            />
          </View>

          <View style={{ height: Spacing.md }} />

          {/* Row for City & State */}
          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>City</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🏙️</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Raipur"
                  placeholderTextColor={Colors.textMuted}
                  value={city}
                  onChangeText={setCity}
                  maxLength={40}
                />
              </View>
            </View>
            <View style={{ width: Spacing.md }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>State</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🗺️</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Chhattisgarh"
                  placeholderTextColor={Colors.textMuted}
                  value={state}
                  onChangeText={setState}
                  maxLength={40}
                />
              </View>
            </View>
          </View>

          <View style={{ height: Spacing.md }} />

          {/* Pincode */}
          <Text style={styles.inputLabel}>Pincode</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>📮</Text>
            <TextInput
              style={styles.inputField}
              placeholder="6-Digit Pincode"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={pincode}
              onChangeText={(text) => setPincode(text.replace(/[^0-9]/g, ''))}
              maxLength={6}
            />
          </View>

          <View style={{ height: Spacing.md }} />

          {/* Referral Code (Optional) */}
          <Text style={styles.inputLabel}>Referral Code (Optional)</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>🎁</Text>
            <TextInput
              style={styles.inputField}
              placeholder="e.g. TIFFIN1234 (Get ₹50 free bonus)"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              value={referralCode}
              onChangeText={setReferralCode}
              maxLength={15}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={{ height: Spacing.xl }} />

          <Button
            title="Save & Continue"
            onPress={handleSave}
            loading={loading}
            disabled={!isFormValid}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    height: height * 0.28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  mascot: {
    fontSize: 48,
    marginBottom: 8,
  },
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
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl + 20,
    ...Shadows.card,
  },
  cardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  sectionHeader: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
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
  inputIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  genderChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
  },
  genderChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  genderText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  genderTextSelected: {
    color: Colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.danger,
    marginTop: 8,
    textAlign: 'center',
  },
});
