import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { AppConfig } from '../../constants/appConfig';
import { Button } from '../ui/Button';
import { Screen } from '../../navigation/AppNavigator';

const { width } = Dimensions.get('window');

interface SubscriptionScreenProps {
  currentPlan: string;
  navigate: (screen: Screen) => void;
  onSubscribe: (planId: string) => void;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ currentPlan, navigate, onSubscribe }) => {
  const [selected, setSelected] = useState(currentPlan === 'none' ? AppConfig.plans[0].id : currentPlan);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.gradient.start, Colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigate('home')} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <Text style={styles.headerSub}>Flexible subscriptions for every appetite</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Plan Cards */}
        {AppConfig.plans.map((plan) => {
          const isSelected = selected === plan.id;
          const isCurrent = currentPlan === plan.id;

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                isSelected && styles.planCardSelected,
                Shadows.card,
              ]}
              onPress={() => setSelected(plan.id)}
              activeOpacity={0.85}
            >
              {/* Best Value Badge */}
              {(plan as any).isBestValue && (
                <View style={styles.bestBadge}>
                  <Text style={styles.bestBadgeText}>⭐ Most Popular</Text>
                </View>
              )}
              {isCurrent && (
                <View style={[styles.bestBadge, { backgroundColor: Colors.accent }]}>
                  <Text style={styles.bestBadgeText}>✓ Current Plan</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View style={styles.planLeft}>
                  <Text style={styles.planEmoji}>{plan.icon}</Text>
                  <View>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPriceDay}>
                      <Text style={styles.planPriceBig}>₹{plan.pricePerDay}</Text>/day
                    </Text>
                  </View>
                </View>
                <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Items */}
              <View style={styles.itemsContainer}>
                {plan.items.map((item, i) => (
                  <View key={i} style={styles.itemRow}>
                    <Text style={styles.itemDot}>✓</Text>
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>

              {/* Monthly total */}
              <View style={styles.monthlyRow}>
                <Text style={styles.monthlyLabel}>Monthly Total</Text>
                <Text style={styles.monthlyPrice}>₹{plan.priceMonthly}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Wallet Recharge Note */}
        <View style={styles.walletNote}>
          <Text style={styles.walletNoteIcon}>💰</Text>
          <Text style={styles.walletNoteText}>
            Add money to your wallet first. Daily amount will be deducted automatically.
          </Text>
        </View>

        <View style={{ height: Spacing.md }} />

        <Button
          title={`Subscribe to ${AppConfig.plans.find(p => p.id === selected)?.name} Plan`}
          onPress={() => {
            onSubscribe(selected);
          }}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom tab bar */}
      <BottomBar active="subscription" navigate={navigate} />
    </View>
  );
};

// Reusable Bottom Bar
export const BottomBar: React.FC<{ active: string; navigate: (s: Screen) => void }> = ({ active, navigate }) => (
  <View style={tabStyles.tabBar}>
    {[
      { icon: '🏠', label: 'Home', screen: 'home' },
      { icon: '📋', label: 'Menu', screen: 'menu' },
      { icon: '🍔', label: 'Eat', screen: 'restaurants' },
      { icon: '💳', label: 'Subscribe', screen: 'subscription' },
      { icon: '👤', label: 'Profile', screen: 'profile' },
    ].map((tab) => (
      <TouchableOpacity
        key={tab.screen}
        style={tabStyles.tabItem}
        onPress={() => navigate(tab.screen as Screen)}
      >
        <Text style={tabStyles.tabIcon}>{tab.icon}</Text>
        <Text style={[tabStyles.tabLabel, tab.screen === active && { color: Colors.primary }]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 55,
    paddingBottom: 24,
    paddingHorizontal: Spacing.lg,
  },
  backBtn: { marginBottom: 8 },
  backText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.textOnPrimary,
  },
  headerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md },

  // Plan Card
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF8F6',
  },
  bestBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestBadgeText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.textOnPrimary,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: 8,
  },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planEmoji: { fontSize: 32 },
  planName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  planPriceDay: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  planPriceBig: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.primary,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: Colors.primary },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  itemsContainer: { gap: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemDot: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.accent,
  },
  itemText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  monthlyLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  monthlyPrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.primary,
  },
  walletNote: {
    flexDirection: 'row',
    backgroundColor: Colors.walletBg,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  walletNoteIcon: { fontSize: 20 },
  walletNoteText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: '#7B5200',
    lineHeight: 20,
  },
});

export const tabStyles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 20,
    paddingTop: 10,
    ...Shadows.card,
  },
  tabItem: { flex: 1, alignItems: 'center' },
  tabIcon: { fontSize: 22 },
  tabLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 3,
  },
});
