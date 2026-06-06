import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { AppConfig } from '../../constants/appConfig';
import { Screen } from '../../navigation/AppNavigator';
import { BottomBar } from './SubscriptionScreen';
import { api } from '../../lib/api';

interface WeeklyMenuScreenProps {
  navigate: (screen: Screen) => void;
}

export const WeeklyMenuScreen: React.FC<WeeklyMenuScreenProps> = ({ navigate }) => {
  const [activeTab, setActiveTab] = useState<'today' | 'weekly'>('weekly');
  const [menuData, setMenuData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMenu = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setIsLoading(true);
    try {
      const { data } = await api.get('/menu/weekly');
      if (data.success) {
        const mapped = data.data.map((item: any) => ({
          ...item,
          id: item.dayIndex !== undefined ? item.dayIndex : (item.id || item._id)
        }));
        setMenuData(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch menu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu(true);
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchMenu(false);
    setRefreshing(false);
  }, []);

  const todayIndex = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1 = Mon, 7 = Sun


  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradient.start, Colors.gradient.end]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigate('home')} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly Menu</Text>
        <Text style={styles.headerSub}>Know what's cooking this week 👨‍🍳</Text>

        {/* Tab switcher */}
        <View style={styles.tabSwitcher}>
          {(['today', 'weekly'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                {tab === 'today' ? "Today's Meal" : 'Weekly Menu'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          (activeTab === 'today' ? menuData.filter(m => m.id === todayIndex) : menuData).map((menu) => {
            const isToday = menu.id === todayIndex;
            return (
              <View key={menu.id} style={[styles.dayCard, isToday && styles.dayCardToday, Shadows.card]}>
                {isToday && (
                  <View style={styles.todayFlag}>
                    <Text style={styles.todayFlagText}>TODAY</Text>
                  </View>
                )}
                <View style={styles.dayRow}>
                  <View style={styles.dayEmojiWrap}>
                    <Text style={styles.dayEmoji}>{menu.emoji}</Text>
                  </View>
                  <View style={styles.dayInfo}>
                    <View style={styles.dayTopRow}>
                      <Text style={[styles.dayName, isToday && { color: Colors.primary }]}>{menu.dayName || menu.day_name}</Text>
                      <View style={styles.vegBadge}>
                        <Text style={styles.vegDot}>🟢</Text>
                        <Text style={styles.vegBadgeText}>Veg</Text>
                      </View>
                    </View>
                    <Text style={styles.dayMain}>{menu.mainDish || menu.main_dish}</Text>
                    <Text style={styles.daySide}>{menu.sideDish || menu.side_dish}</Text>
                    <Text style={styles.dayCalories}>{menu.calories || '~500 kcal'}</Text>
                  </View>
                </View>
                {isToday && (
                  <View style={styles.orderNowRow}>
                    <TouchableOpacity style={styles.trackBtn} onPress={() => navigate('tracking')}>
                      <Text style={styles.trackBtnText}>🛵 Track Today's Order</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomBar active="menu" navigate={navigate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 55, paddingBottom: 16, paddingHorizontal: Spacing.lg },
  backBtn: { marginBottom: 8 },
  backText: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.85)' },
  headerTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize['2xl'], color: Colors.textOnPrimary },
  headerSub: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 16 },
  tabSwitcher: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: Radius.full, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.full },
  tabBtnActive: { backgroundColor: Colors.surface },
  tabBtnText: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.75)' },
  tabBtnTextActive: { color: Colors.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  dayCardToday: { borderLeftColor: Colors.primary, backgroundColor: '#FFF8F6' },
  todayFlag: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10, paddingVertical: 4,
    borderBottomLeftRadius: Radius.md,
  },
  todayFlagText: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xs, color: Colors.textOnPrimary },
  dayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dayEmojiWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#FFF4F0', alignItems: 'center', justifyContent: 'center',
  },
  dayEmoji: { fontSize: 26 },
  dayInfo: { flex: 1, paddingRight: 40 },
  dayTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  dayName: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.md, color: Colors.textPrimary },
  vegBadge: {
    backgroundColor: '#E8F8EF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegDot: {
    fontSize: 8,
    marginRight: 3,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  vegBadgeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.accent,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  dayMain: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.fontSize.base, color: Colors.primary, marginBottom: 2 },
  daySide: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  dayCalories: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginTop: 4 },
  orderNowRow: { marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  trackBtn: {
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.full,
    paddingVertical: 8, alignItems: 'center',
  },
  trackBtnText: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.fontSize.sm, color: Colors.primary },
});
