import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { Screen, User } from '../../navigation/AppNavigator';
import { BottomBar } from './SubscriptionScreen';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { socket } from '../../lib/socket';

interface VacationModeScreenProps {
  navigate: (screen: Screen) => void;
  user: User;
}

interface VacationRequest {
  _id?: string;
  startDate: string;
  endDate: string;
  reason: string;
  days: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  requestedAt: string;
}

export const VacationModeScreen: React.FC<VacationModeScreenProps> = ({ navigate, user }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [isOnVacation, setIsOnVacation] = useState(false);

  const fetchMyVacations = async () => {
    try {
      const { data } = await api.get('/vacation/my');
      if (data.success) {
        setVacations(data.data);
        setIsOnVacation(data.isOnVacation);
      }
    } catch (e) {
      console.log('Error fetching vacations:', e);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchMyVacations();

    // Listen for status updates from admin
    socket.on('vacation_status_updated', (data: any) => {
      const statusMessages: Record<string, string> = {
        active: '✅ Admin ne aapki vacation approve kar di! Tiffin pause hai.',
        completed: '🏠 Vacation khatam. Welcome back! Tiffin resume ho gaya.',
        cancelled: '❌ Admin ne aapki vacation cancel kar di.',
      };
      if (statusMessages[data.status]) {
        Alert.alert('Vacation Update', statusMessages[data.status]);
      }
      fetchMyVacations();
    });

    return () => {
      socket.off('vacation_status_updated');
    };
  }, []);

  const handleConfirm = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const { data } = await api.post('/vacation/request', {
        startDate,
        endDate,
        reason,
      });
      if (data.success) {
        Alert.alert('✅ Vacation Scheduled!', `From ${startDate} to ${endDate}. Admin ko notify kar diya gaya hai.`);
        setStartDate('');
        setEndDate('');
        setReason('');
        fetchMyVacations();
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Kuch gadbad ho gayi. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    Alert.alert(
      'Cancel Vacation?',
      'Kya aap ye vacation cancel karna chahte ho?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data } = await api.delete(`/vacation/${requestId}/cancel`);
              if (data.success) {
                fetchMyVacations();
                Alert.alert('Cancelled', 'Vacation cancel ho gayi.');
              }
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.message || 'Try again');
            }
          },
        },
      ]
    );
  };

  const statusColor: Record<string, string> = {
    pending: '#F59E0B',
    active: '#10B981',
    completed: '#6B7280',
    cancelled: '#EF4444',
  };

  const statusLabel: Record<string, string> = {
    pending: '⏳ Pending',
    active: '✅ Active',
    completed: '🏠 Completed',
    cancelled: '❌ Cancelled',
  };

  return (
    <View style={[styles.container, Platform.OS === 'web' && { overflow: 'hidden' as any }]}>
      <LinearGradient
        colors={['#8B5CF6', '#6D28D9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigate('profile')} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerEmoji}>🏖️</Text>
        <Text style={styles.headerTitle}>Vacation Mode</Text>
        <Text style={styles.headerSub}>
          {isOnVacation
            ? '⏸ Tiffin abhi paused hai. Enjoy your break!'
            : 'Tiffin pause karo specific dates ke liye. Wallet safe rahega.'}
        </Text>
        {isOnVacation && (
          <View style={styles.vacationActiveBadge}>
            <Text style={styles.vacationActiveBadgeText}>🏖️ VACATION MODE ON</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            💡 Vacation mode mein koi tiffin deliver nahi hoga aur wallet se kuch deduct nahi hoga. Admin approve karte hi tiffin pause ho jaayega!
          </Text>
        </View>

        {/* New Vacation Form */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.cardTitle}>📅 Naya Vacation Plan Karo</Text>

          <Text style={styles.inputLabel}>Start Date</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2026-06-01"
            placeholderTextColor={Colors.textMuted}
            value={startDate}
            onChangeText={setStartDate}
          />

          <Text style={styles.inputLabel}>End Date</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2026-06-07"
            placeholderTextColor={Colors.textMuted}
            value={endDate}
            onChangeText={setEndDate}
          />

          <Text style={styles.inputLabel}>Reason (Optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Ghar ja raha hoon Diwali ke liye..."
            placeholderTextColor={Colors.textMuted}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
          />

          <View style={{ height: Spacing.sm }} />
          <Button
            title="Set Vacation Mode"
            onPress={handleConfirm}
            loading={loading}
            disabled={!startDate || !endDate}
          />
        </View>

        {/* My Vacations */}
        <Text style={styles.sectionTitle}>📋 Meri Vacations</Text>

        {fetchLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
        ) : vacations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>✈️</Text>
            <Text style={styles.emptyText}>Abhi koi vacation set nahi hai</Text>
          </View>
        ) : (
          vacations
            .filter(v => v.status !== 'cancelled')
            .map((trip, idx) => (
              <View key={trip._id || idx} style={[styles.tripCard, Shadows.subtle]}>
                <View style={styles.tripLeft}>
                  <Text style={styles.tripName}>
                    {trip.reason || 'Vacation'}
                  </Text>
                  <Text style={styles.tripDates}>
                    {trip.startDate} → {trip.endDate} ({trip.days} din)
                  </Text>
                  {trip.status === 'pending' && (
                    <Text style={styles.pendingNote}>Admin approval awaited...</Text>
                  )}
                </View>
                <View style={styles.tripRight}>
                  <View style={[styles.tripBadge, { backgroundColor: statusColor[trip.status] + '20' }]}>
                    <Text style={[styles.tripBadgeText, { color: statusColor[trip.status] }]}>
                      {statusLabel[trip.status]}
                    </Text>
                  </View>
                  {trip.status === 'pending' && trip._id && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(trip._id!)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomBar active="profile" navigate={navigate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 55,
    paddingBottom: 24,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: 12 },
  backText: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.85)' },
  headerEmoji: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize['2xl'], color: Colors.textOnPrimary },
  headerSub: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  vacationActiveBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  vacationActiveBadgeText: { fontFamily: Typography.fontFamily.bold, fontSize: 12, color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md },
  infoCard: {
    backgroundColor: '#EDE9FE',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  infoText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: '#5B21B6', lineHeight: 20 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  cardTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.md, color: Colors.textPrimary, marginBottom: Spacing.md },
  inputLabel: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  sectionTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.md, color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptyCard: { alignItems: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.textMuted },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: 8,
  },
  tripLeft: { flex: 1, marginRight: 8 },
  tripRight: { alignItems: 'flex-end', gap: 6 },
  tripName: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  tripDates: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginTop: 3 },
  pendingNote: { fontFamily: Typography.fontFamily.regular, fontSize: 10, color: '#F59E0B', marginTop: 4 },
  tripBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  tripBadgeText: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.fontSize.xs },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelBtnText: { fontFamily: Typography.fontFamily.semiBold, fontSize: 10, color: '#EF4444' },
});
