import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Linking,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { Screen, User } from '../../navigation/AppNavigator';
import { BottomBar } from './SubscriptionScreen';
import { Button } from '../ui/Button';
import { AppConfig } from '../../constants/appConfig';

interface WalletScreenProps {
  user: User;
  navigate: (screen: Screen) => void;
  onRecharge: (amount: number, utr: string) => void;
  transactions: any[];
  refreshUser?: () => Promise<void>;
}

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000];

export const WalletScreen: React.FC<WalletScreenProps> = ({ user, navigate, onRecharge, transactions, refreshUser }) => {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [utrCode, setUtrCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (refreshUser) {
      await refreshUser();
    }
    setRefreshing(false);
  }, [refreshUser]);

  const upiId = 'tapeshkarkel@okaxis'; // Merchant UPI ID
  const merchantName = 'My Tiffin';

  const handleRecharge = async () => {
    const amount = selectedAmount || parseInt(customAmount);
    if (!amount || amount < 50) return;

    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=Tiffin%20Wallet%20Recharge`;

    setShowQRModal(true);

    if (Platform.OS !== 'web') {
      try {
        const supported = await Linking.canOpenURL(upiUrl);
        if (supported) {
          await Linking.openURL(upiUrl);
        }
      } catch (e) {
        console.log('UPI deep link not supported/failed:', e);
      }
    }
  };

  // Dynamically get plan details based on active subscription
  const currentPlanDetails = AppConfig.plans.find(p => p.id === user.plan) || AppConfig.plans.find(p => p.id === 'standard')!;
  const dailyRate = currentPlanDetails.pricePerDay;
  const planName = currentPlanDetails.name;

  const selectedFinal = selectedAmount || (customAmount ? parseInt(customAmount) : 0);
  const daysLeft = selectedFinal ? Math.floor(selectedFinal / dailyRate) : 0;

  return (
    <View style={styles.container}>
      {/* Wallet Header - Gold theme */}
      <LinearGradient
        colors={['#F59E0B', '#D97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigate('home')} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balanceAmount}>₹{user.walletBalance.toLocaleString()}</Text>
          <Text style={styles.balanceSub}>
            ≈ {Math.floor(user.walletBalance / dailyRate)} days of {planName} Tiffin remaining
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >

        {/* Recharge Section */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.sectionTitle}>💳 Recharge Wallet</Text>

          {/* Quick amounts */}
          <View style={styles.amountsGrid}>
            {QUICK_AMOUNTS.map(amount => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.amountChip,
                  selectedAmount === amount && styles.amountChipSelected,
                ]}
                onPress={() => {
                  setSelectedAmount(amount);
                  setCustomAmount('');
                }}
              >
                <Text style={[
                  styles.amountChipText,
                  selectedAmount === amount && styles.amountChipTextSelected,
                ]}>
                  ₹{amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom amount */}
          <View style={styles.customInputRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.customInput}
              placeholder="Enter custom amount"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              value={customAmount}
              onChangeText={(v) => {
                setCustomAmount(v);
                setSelectedAmount(null);
              }}
            />
          </View>

          {/* Days preview */}
          {selectedFinal > 0 && (
            <View style={styles.previewRow}>
              <Text style={styles.previewText}>
                ₹{selectedFinal} = <Text style={styles.previewHighlight}>{daysLeft} days</Text> of {planName} Tiffin
              </Text>
            </View>
          )}

          <View style={{ height: Spacing.sm }} />
          <Button
            title={`Recharge ₹${selectedFinal || '---'}`}
            onPress={handleRecharge}
            loading={loading}
            disabled={!selectedFinal || selectedFinal < 50}
          />
        </View>

        {/* Transaction History */}
        <Text style={styles.historyTitle}>Transaction History</Text>
        {transactions && transactions.length > 0 ? (
          transactions.map(tx => {
            let icon = '💰';
            let label = tx.description || 'Transaction';
            if (tx.type === 'recharge') icon = '💳';
            else if (tx.type === 'meal_debit') icon = '🍱';
            else if (tx.type === 'addon_debit') icon = '⚡';
            else if (tx.type === 'refund') icon = '↩️';

            const dateStr = tx.createdAt || tx.created_at
              ? new Date(tx.createdAt || tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
              : 'Date N/A';

            const isPositive = tx.type === 'recharge' || tx.type === 'refund';
            const amountVal = Number(tx.amount);

            return (
              <View key={tx._id || tx.id} style={[styles.txCard, Shadows.subtle]}>
                <View style={styles.txIcon}>
                  <Text style={{ fontSize: 22 }}>{icon}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txLabel} numberOfLines={1}>{label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={styles.txDate}>{dateStr}</Text>
                    {tx.type === 'recharge' && (
                      <View style={{
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        backgroundColor: tx.status === 'approved' ? '#DEF7EC' : tx.status === 'rejected' ? '#FDE8E8' : '#FEF3C7',
                      }}>
                        <Text style={{
                          fontSize: 9,
                          fontFamily: Typography.fontFamily.bold,
                          color: tx.status === 'approved' ? '#03543F' : tx.status === 'rejected' ? '#9B1C1C' : '#92400E',
                          textTransform: 'uppercase',
                        }}>
                          {tx.status || 'pending'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={[
                  styles.txAmount,
                  isPositive ? styles.txAmountPositive : styles.txAmountNegative
                ]}>
                  {isPositive ? `+₹${Math.abs(amountVal)}` : `-₹${Math.abs(amountVal)}`}
                </Text>
              </View>
            );
          })
        ) : (
          <View style={{ padding: 24, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md }}>
            <Text style={{ fontFamily: Typography.fontFamily.medium, color: Colors.textMuted, fontSize: 13 }}>No transaction history found.</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomBar active="home" navigate={navigate} />

      {/* UPI QR CODE MODAL */}
      {showQRModal && (
        <View style={styles.modalOverlayAbsolute}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan UPI QR to Pay</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* QR Image */}
            <View style={styles.qrContainer}>
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
                      merchantName
                    )}&am=${selectedFinal}&cu=INR&tn=Tiffin%20Recharge`
                  )}`,
                }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>

            {/* Merchant Details */}
            <Text style={styles.merchantLabel}>Amount to Pay</Text>
            <Text style={styles.merchantAmount}>₹{selectedFinal}</Text>
            <Text style={styles.merchantInfo}>UPI ID: {upiId}</Text>
            <Text style={styles.merchantName}>{merchantName}</Text>

            {/* UTR Input Section */}
            <View style={{ width: '100%', marginTop: 15, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, backgroundColor: '#F8FAFC' }}>
              <Text style={{ fontSize: 11, fontFamily: Typography.fontFamily.semiBold, color: Colors.textSecondary, marginBottom: 6 }}>
                Enter UPI Ref / UTR No. (12-Digit) *
              </Text>
              <TextInput
                style={{ fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textPrimary, paddingVertical: 6, borderBottomWidth: 1.5, borderBottomColor: Colors.primary }}
                placeholder="e.g. 618930492812"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={12}
                value={utrCode}
                onChangeText={setUtrCode}
              />
            </View>

            {/* Confirm button */}
            <TouchableOpacity
              style={[styles.confirmBtn, (!utrCode || utrCode.trim().length < 8) && { opacity: 0.5 }]}
              disabled={!utrCode || utrCode.trim().length < 8}
              onPress={() => {
                setShowQRModal(false);
                onRecharge(selectedFinal, utrCode.trim());
                setSelectedAmount(null);
                setCustomAmount('');
                setUtrCode('');
              }}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmBtnGrad}
              >
                <Text style={styles.confirmBtnTxt}>I Have Paid (Confirm)</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.modalFooterNote}>
              Please scan the QR code with any UPI App (GPay, PhonePe, Paytm) to complete payment.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 55,
    paddingBottom: 30,
    paddingHorizontal: Spacing.lg,
  },
  backBtn: { marginBottom: 16 },
  backText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  balanceSection: { alignItems: 'center' },
  balanceLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceAmount: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: Typography.fontSize['4xl'],
    color: Colors.textOnPrimary,
    marginVertical: 6,
  },
  balanceSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  amountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  amountChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  amountChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF4F0',
  },
  amountChipText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  amountChipTextSelected: { color: Colors.primary },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  currencySymbol: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.primary,
    paddingRight: 8,
  },
  customInput: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  previewRow: {
    backgroundColor: '#F0FFF4',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  previewText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  previewHighlight: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.accent,
  },

  // Transactions
  historyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: 8,
    gap: 12,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  txDate: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
  },
  txAmountPositive: { color: Colors.accent },
  txAmountNegative: { color: Colors.danger },
  txAmountNeutral: { color: Colors.textMuted },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalOverlayAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    width: '100%',
    maxWidth: 340,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnTxt: {
    fontSize: 18,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 16,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  merchantLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Typography.fontFamily.medium,
  },
  merchantAmount: {
    fontSize: 28,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#D97706',
    marginVertical: 4,
  },
  merchantInfo: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  merchantName: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    fontFamily: Typography.fontFamily.regular,
  },
  confirmBtn: {
    width: '100%',
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 12,
  },
  confirmBtnGrad: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnTxt: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
  },
  modalFooterNote: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
    fontFamily: Typography.fontFamily.regular,
  },
});
