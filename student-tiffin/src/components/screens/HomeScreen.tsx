import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { AppConfig } from '../../constants/appConfig';
import { Button } from '../ui/Button';
import { User, Screen } from '../../navigation/AppNavigator';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { BottomBar } from './SubscriptionScreen';
import { api } from '../../lib/api';
import { socket } from '../../lib/socket';
import { HomeScreenSkeleton } from '../ui/SkeletonLoader';
import { DeliveryAnimation } from '../ui/DeliveryAnimation';


const { width } = Dimensions.get('window');
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TODAY_INDEX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
const TODAY = DAYS[TODAY_INDEX];

interface HomeScreenProps {
  user: User;
  navigate: (screen: Screen) => void;
  refreshUser?: () => Promise<void>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ user, navigate, refreshUser }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [selectedDay, setSelectedDay] = useState(TODAY);
  const [menuData, setMenuData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const fetchMenuPromise = async () => {
        try {
          const { data } = await api.get('/menu/weekly');
          if (data && data.success && data.data && data.data.length > 0) {
            const mapped = data.data.map((m: any) => ({
              id: m._id || m.id,
              day_name: m.dayName,
              main_dish: m.mainDish,
              side_dish: m.sideDish,
              emoji: m.emoji || '🍲'
            }));
            setMenuData(mapped);
          }
        } catch (e) {
          console.log('Error refreshing menu:', e);
        }
      };

      const fetchActiveOrderPromise = async () => {
        try {
          const { data } = await api.get('/orders/myorders');
          if (data.success && data.data.length > 0) {
            const latestOrder = data.data[0];
            const orderDate = new Date(latestOrder.updatedAt || latestOrder.createdAt);
            const diffHours = (new Date().getTime() - orderDate.getTime()) / (1000 * 60 * 60);
            if (latestOrder.status !== 'delivered' || diffHours < 1.5) {
              setActiveOrder(latestOrder);
              const totalSecs = calculateOrderETASeconds(latestOrder);
              setEtaSeconds(totalSecs);
            } else {
              setActiveOrder(null);
            }
          } else {
            setActiveOrder(null);
          }
        } catch (e) {
          console.log('Error refreshing active order:', e);
        }
      };

      await Promise.all([
        fetchMenuPromise(),
        fetchActiveOrderPromise(),
        refreshUser ? refreshUser() : Promise.resolve(),
      ]);
    } catch (err) {
      console.log('Error during home screen pull-to-refresh:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser]);

  const HOSTEL_COORDS: Record<string, { lat: number; lng: number }> = {
    'BH-3': { lat: 28.6200, lng: 77.2100 },
    'BH-1': { lat: 28.6180, lng: 77.2060 },
    'BH-2': { lat: 28.6210, lng: 77.2120 },
    'GH-1': { lat: 28.6180, lng: 77.2060 },
    'GH-2': { lat: 28.6190, lng: 77.2080 },
    'Boys Hostel 3':  { lat: 28.6200, lng: 77.2100 },
    'Girls Hostel 1': { lat: 28.6180, lng: 77.2060 },
    'Girls Hostel 2': { lat: 28.6190, lng: 77.2080 },
    'Boys Hostel 2':  { lat: 28.6210, lng: 77.2120 },
  };

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateOrderETASeconds = (order: any): number => {
    if (!order) return 0;
    const destHostel = order.profiles?.address_hostel || 'BH-3';
    const destLoc = HOSTEL_COORDS[destHostel] || HOSTEL_COORDS['BH-3'];
    
    let riderLat = order.riderLatitude || order.rider?.latitude || (destLoc.lat - 0.005);
    let riderLng = order.riderLongitude || order.rider?.longitude || (destLoc.lng - 0.003);

    const statusMap: Record<string, number> = {
      pending: 0,
      cooking: 0,
      packed: 1,
      out_for_delivery: 2,
      delivered: 3,
    };
    const currentStatus = statusMap[order.status] ?? 0;

    const distance = getDistanceFromLatLonInKm(riderLat, riderLng, destLoc.lat, destLoc.lng);
    const travelTimeMinutes = distance * 4; // Assuming 15 km/h (4 minutes per km)

    let totalMinutes = 0;
    if (currentStatus === 0) {
      totalMinutes = 15 + travelTimeMinutes;
    } else if (currentStatus === 1) {
      totalMinutes = 5 + travelTimeMinutes;
    } else if (currentStatus === 2) {
      totalMinutes = travelTimeMinutes;
    } else {
      return 0;
    }

    return Math.round(totalMinutes * 60);
  };

  const formatETA = (seconds: number | null, orderStatus: string): string => {
    if (orderStatus === 'delivered') return 'Delivered';
    if (seconds === null || seconds <= 0) return 'Arriving soon';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const padSecs = secs < 10 ? `0${secs}` : secs;
    const padMins = mins < 10 ? `0${mins}` : mins;
    return `${padMins}m:${padSecs}s`;
  };
  const [isAddonModalVisible, setIsAddonModalVisible] = useState(false);
  const [addonCounts, setAddonCounts] = useState<Record<string, number>>({
    extra_roti: 0,
    curd: 0,
    gulab_jamun: 0,
    salad: 0
  });

  // Meal Rating state
  const [myRating, setMyRating] = useState<number>(0);         // selected star (0 = not rated)
  const [hasRatedToday, setHasRatedToday] = useState(false);   // already submitted
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get('/menu/weekly');
        if (data && data.success && data.data && data.data.length > 0) {
          const mapped = data.data.map((m: any) => ({
            id: m._id || m.id,
            day_name: m.dayName,
            main_dish: m.mainDish,
            side_dish: m.sideDish,
            emoji: m.emoji || '🍲'
          }));
          setMenuData(mapped);
        } else {
          throw new Error('Menu fetch failed');
        }
      } catch (e) {
        console.log('Using default static menu data:', e);
        setMenuData([
          { id: 1, day_name: 'Monday', main_dish: 'Dal + Sabji', side_dish: 'Roti, Rice', emoji: '🍲' },
          { id: 2, day_name: 'Tuesday', main_dish: 'Rajma + Aloo', side_dish: 'Roti, Rice', emoji: '🫘' },
          { id: 3, day_name: 'Wednesday', main_dish: 'Chole + Paneer Masala', side_dish: 'Roti, Rice', emoji: '🍛' },
          { id: 4, day_name: 'Thursday', main_dish: 'Ghar-Made Masala', side_dish: 'Roti, Rice', emoji: '🌶️' },
          { id: 5, day_name: 'Friday', main_dish: 'Palak + Packed Soups', side_dish: 'Roti, Rice', emoji: '🥬' },
          { id: 6, day_name: 'Saturday', main_dish: 'Special Meal', side_dish: 'Roti, Rice + Meetha', emoji: '⭐' },
          { id: 7, day_name: 'Sunday', main_dish: 'Holiday', side_dish: 'No Service', emoji: '🛌' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();

    // Sockets will push update_menu notifications to trigger menu updates
    const handleMenuUpdated = () => {
      fetchMenu();
    };

    socket.on('menu_updated', handleMenuUpdated);

    // Check if student already rated today
    const checkRating = async () => {
      try {
        const { data } = await api.get('/meal/my-rating');
        if (data.success && data.hasRated && data.data) {
          setHasRatedToday(true);
          setMyRating(data.data.rating);
          setRatingComment(data.data.comment || '');
        }
      } catch (e) { /* ignore */ }
    };
    checkRating();

    return () => {
      socket.off('menu_updated', handleMenuUpdated);
    };
  }, []);

  // Fetch active order and connect to sockets on mount
  useEffect(() => {
    let mounted = true;
    
    const fetchActiveOrder = async () => {
      try {
        const { data } = await api.get('/orders/myorders');
        if (data.success && data.data.length > 0 && mounted) {
          const latestOrder = data.data[0];
          const orderDate = new Date(latestOrder.updatedAt || latestOrder.createdAt);
          const diffHours = (new Date().getTime() - orderDate.getTime()) / (1000 * 60 * 60);
          if (latestOrder.status !== 'delivered' || diffHours < 1.5) {
            setActiveOrder(latestOrder);
            const totalSecs = calculateOrderETASeconds(latestOrder);
            setEtaSeconds(totalSecs);
            socket.emit('join_order_room', latestOrder._id);
          } else {
            setActiveOrder(null);
          }
        }
      } catch (e) {
        console.log('Failed to fetch active order on home screen:', e);
      }
    };

    fetchActiveOrder();

    const onStatusUpdate = (updateData: any) => {
      if (!mounted) return;
      setActiveOrder((prev: any) => {
        if (!prev || prev._id !== updateData._id) return prev;
        const next = { ...prev, ...updateData };
        setEtaSeconds(calculateOrderETASeconds(next));
        return next;
      });
    };

    const onRiderLoc = (loc: { latitude: number; longitude: number }) => {
      if (!mounted) return;
      setActiveOrder((prev: any) => {
        if (!prev) return null;
        const next = { ...prev, riderLatitude: loc.latitude, riderLongitude: loc.longitude };
        setEtaSeconds(calculateOrderETASeconds(next));
        return next;
      });
    };

    socket.on('order_status_updated', onStatusUpdate);
    socket.on('rider_location_changed', onRiderLoc);

    return () => {
      mounted = false;
      socket.off('order_status_updated', onStatusUpdate);
      socket.off('rider_location_changed', onRiderLoc);
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (etaSeconds === null || etaSeconds <= 0) return;
    const interval = setInterval(() => {
      setEtaSeconds(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [etaSeconds]);

  if (isLoading || menuData.length === 0) {
    return <HomeScreenSkeleton />;
  }

  const currentPlan = AppConfig.plans.find(p => p.id === user.plan) || {
    id: 'none',
    name: 'No Active Plan',
    priceMonthly: 0,
    pricePerDay: 0,
    color: '#888888',
    description: 'Please subscribe to a plan to start receiving tiffins.',
    items: [],
    icon: '🍽️',
  };
  const todayMenu = menuData.find(m => m.day_name === selectedDay) || menuData[0];

  const handlePauseToggle = () => {
    setIsPaused(prev => !prev);
  };

  const handleRateMeal = async (star: number) => {
    if (hasRatedToday) return;
    setMyRating(star);
  };

  const handleSubmitRating = async () => {
    if (myRating === 0 || hasRatedToday) return;
    setRatingLoading(true);
    try {
      const { data } = await api.post('/meal/rate', {
        rating: myRating,
        comment: ratingComment,
        mealName: todayMenu?.main_dish || 'Today\'s Meal',
        dayName: TODAY,
      });
      if (data.success) {
        setHasRatedToday(true);
        Alert.alert('🌟 Thank You!', 'Aapki rating submit ho gayi. Admin ko live dikhi jaayegi!');
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Rating submit nahi hui. Try again.');
    } finally {
      setRatingLoading(false);
    }
  };

  const handleOpenAddonModal = () => {
    setAddonCounts({
      extra_roti: 0,
      curd: 0,
      gulab_jamun: 0,
      salad: 0
    });
    setIsAddonModalVisible(true);
  };

  const updateAddonCount = (id: string, delta: number) => {
    setAddonCounts(prev => ({
      ...prev,
      [id]: Math.max(0, prev[id] + delta)
    }));
  };

  const getAddonsTotal = () => {
    return AppConfig.addOns.reduce((sum, addon) => {
      return sum + addon.price * (addonCounts[addon.id] || 0);
    }, 0);
  };

  const handleConfirmAddons = async () => {
    const total = getAddonsTotal();
    if (total === 0) {
      setIsAddonModalVisible(false);
      return;
    }

    if (user.walletBalance < total) {
      Alert.alert(
        'Insufficient Balance',
        `Required amount is ₹${total}, but your wallet balance is ₹${user.walletBalance}. Please recharge first.`
      );
      return;
    }

    const itemsToOrder = AppConfig.addOns
      .map(addon => {
        const qty = addonCounts[addon.id] || 0;
        if (qty > 0) {
          return {
            name: addon.name,
            quantity: qty,
            price: addon.price
          };
        }
        return null;
      })
      .filter(Boolean);

    try {
      console.log('🚀 Sending multi-item add-on order API request:', itemsToOrder);
      const { data } = await api.post('/orders/place', {
        items: itemsToOrder,
        totalAmount: total,
        paymentMethod: 'wallet'
      });

      if (data.success) {
        console.log('✅ Multi-item add-on order placed successfully:', data.data?._id);
        setIsAddonModalVisible(false);
        Alert.alert(
          'Extras Ordered!',
          `Successfully added to your tonight's delivery. ₹${total} has been deducted from your wallet.`
        );
      }
    } catch (err: any) {
      console.error('❌ Error placing multi-addon order:', err.response?.data || err.message);
      Alert.alert('Order Failed', err.response?.data?.message || err.message || 'Something went wrong.');
    }
  };

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <View style={[styles.container, Platform.OS === 'web' && { overflow: 'hidden' as any }]}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.gradient.start, Colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello {user.name} 👋</Text>
            <Text style={styles.headerSub}>What's for today?</Text>
          </View>
          <View style={styles.headerRight}>
            {/* Streak badge */}
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {user.streak}</Text>
            </View>
            {/* Wallet */}
            <TouchableOpacity style={styles.walletBadge} onPress={() => navigate('wallet')}>
              <Text style={styles.walletText}>₹{user.walletBalance}</Text>
            </TouchableOpacity>
          </View>
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

        {/* ─── TODAY'S MEAL CARD (smart: holiday / paused / active) ─── */}
        {(() => {
          const isHoliday = todayMenu.main_dish === 'Holiday' || todayMenu.side_dish === 'No Service';
          const hasNoPlan = currentPlan.id === 'none';
          const noTiffinToday = isHoliday || isPaused || hasNoPlan;

          if (noTiffinToday) {
            // ─ Empty state card ─
            let icon = '😴';
            let headline = '';
            let subtext = '';
            let badgeBg = '#F1F5F9';
            let badgeText = '#64748B';

            if (isHoliday) {
              icon = '🏖️';
              headline = 'No Tiffin Today!';
              subtext = "It's Sunday — kitchen is closed. See you tomorrow 🙏";
              badgeBg = '#FEF3C7';
              badgeText = '#92400E';
            } else if (isPaused) {
              icon = '⏸️';
              headline = 'Tiffin Paused';
              subtext = 'You have paused your tiffin. Toggle below to resume.';
              badgeBg = '#EDE9FE';
              badgeText = '#5B21B6';
            } else {
              icon = '📋';
              headline = 'No Active Plan';
              subtext = 'Subscribe to a plan below to start receiving tiffin.';
              badgeBg = '#FEE2E2';
              badgeText = '#991B1B';
            }

            return (
              <View style={[styles.mealCard, Shadows.card, { alignItems: 'center', paddingVertical: 28 }]}>
                <Text style={{ fontSize: 52, marginBottom: 10 }}>{icon}</Text>
                <View style={{
                  backgroundColor: badgeBg,
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 4,
                  marginBottom: 10,
                }}>
                  <Text style={{ fontSize: 12, fontFamily: Typography.fontFamily.bold, color: badgeText }}>
                    {isHoliday ? 'HOLIDAY' : isPaused ? 'PAUSED' : 'NO PLAN'}
                  </Text>
                </View>
                <Text style={{ fontSize: 18, fontFamily: Typography.fontFamily.bold, color: '#1E293B', marginBottom: 6 }}>
                  {headline}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, fontFamily: Typography.fontFamily.regular, paddingHorizontal: 16 }}>
                  {subtext}
                </Text>
                {hasNoPlan && !isHoliday && (
                  <TouchableOpacity
                    onPress={() => navigate('subscription')}
                    style={{ marginTop: 16, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontFamily: Typography.fontFamily.bold }}>
                      📋 Subscribe Now
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }

          // ─ Active tiffin card ─
          if (activeOrder) {
            const statusMap: Record<string, number> = {
              pending: 0,
              cooking: 0,
              packed: 1,
              out_for_delivery: 2,
              delivered: 3,
            };
            const currentStatusIndex = statusMap[activeOrder.status] ?? 0;
            const orderLabel = activeOrder.restaurant?.name 
              ? `${activeOrder.restaurant.name} Tiffin`
              : `${(activeOrder.plan_type || 'standard').toUpperCase()} Tiffin`;

            return (
              <TouchableOpacity
                style={[styles.mealCard, Shadows.card]}
                onPress={() => navigate('tracking')}
                activeOpacity={0.9}
              >
                <View style={styles.mealCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.mealCardLabel, { color: Colors.primary, fontWeight: 'bold' }]}>🔴 LIVE TRACKING</Text>
                      {activeOrder.status === 'out_for_delivery' && (
                        <DeliveryAnimation size="mini" />
                      )}
                    </View>
                    <Text style={styles.mealCardTitle}>{orderLabel}</Text>
                    <Text style={styles.mealCardSub}>
                      {activeOrder.status === 'delivered' 
                        ? 'Delivered! Hope you liked it'
                        : `Eta: ${formatETA(etaSeconds, activeOrder.status)}`}
                    </Text>
                  </View>
                  <Text style={styles.mealEmoji}>
                    {activeOrder.status === 'delivered' ? '🎉' : '🍱'}
                  </Text>
                </View>

                {/* Delivery Info */}
                <View style={styles.deliveryInfo}>
                  <View style={[styles.deliveryDot, { backgroundColor: activeOrder.status === 'delivered' ? Colors.accent : '#F39C12' }]} />
                  <Text style={styles.deliveryText}>
                    {activeOrder.status === 'delivered' 
                      ? 'Delivered at ' + new Date(activeOrder.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : `Next Delivery: Tonight by ${AppConfig.deliveryTimeWindow}`}
                  </Text>
                </View>

                {/* Order tracking mini bar */}
                <View style={styles.trackBar}>
                  {AppConfig.orderStatuses.map((status, i) => (
                    <View key={status.id} style={styles.trackStep}>
                      <View style={[
                        styles.trackDot,
                        i <= currentStatusIndex && { backgroundColor: status.color || Colors.primary },
                      ]}>
                        <Text style={{ fontSize: 10 }}>{status.icon}</Text>
                      </View>
                      {i < AppConfig.orderStatuses.length - 1 && (
                        <View style={[
                          styles.trackLine,
                          i < currentStatusIndex && { backgroundColor: AppConfig.orderStatuses[i+1].color || Colors.primary },
                        ]} />
                      )}
                    </View>
                  ))}
                </View>
                <View style={styles.trackStatusRow}>
                  <Text style={[styles.trackStatus, { fontWeight: 'bold', color: AppConfig.orderStatuses[currentStatusIndex].color }]}>
                    Currently: {AppConfig.orderStatuses[currentStatusIndex].label} {AppConfig.orderStatuses[currentStatusIndex].icon}
                  </Text>
                  <Text style={styles.trackLink}>Track Order →</Text>
                </View>
              </TouchableOpacity>
            );
          }

          // If no active order from DB, show static scheduled card
          return (
            <TouchableOpacity
              style={[styles.mealCard, Shadows.card]}
              onPress={() => navigate('tracking')}
              activeOpacity={0.9}
            >
              <View style={styles.mealCardHeader}>
                <View>
                  <Text style={styles.mealCardLabel}>Today's Meal (Scheduled)</Text>
                  <Text style={styles.mealCardTitle}>{todayMenu.main_dish}</Text>
                  <Text style={styles.mealCardSub}>{todayMenu.side_dish}</Text>
                </View>
                <Text style={styles.mealEmoji}>{todayMenu.emoji}</Text>
              </View>

              {/* Delivery Info */}
              <View style={styles.deliveryInfo}>
                <View style={styles.deliveryDot} />
                <Text style={styles.deliveryText}>
                  Scheduled: Tonight by {AppConfig.deliveryTimeWindow}
                </Text>
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 12, marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: Colors.textSecondary, fontFamily: Typography.fontFamily.medium }}>
                  ⏳ Tracking starts when preparation begins.
                </Text>
                <Text style={styles.trackLink}>View Details →</Text>
              </View>
            </TouchableOpacity>
          );
        })()}


        {/* Plan Info + Pause */}
        <View style={[styles.planCard, Shadows.subtle]}>
          <View style={styles.planLeft}>
            <Text style={styles.planLabel}>Your Plan</Text>
            <Text style={styles.planName}>{currentPlan.name}</Text>
            <Text style={styles.planPrice}>₹{currentPlan.priceMonthly}/month</Text>
          </View>
          <View style={styles.pauseSection}>
            <Text style={styles.pauseLabel}>{isPaused ? '⏸ Paused' : '▶ Active'}</Text>
            <Switch
              value={!isPaused}
              onValueChange={handlePauseToggle}
              trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
              thumbColor={isPaused ? Colors.textMuted : Colors.primary}
            />
          </View>
        </View>

        {isPaused && (
          <View style={styles.pauseAlert}>
            <Text style={styles.pauseAlertText}>
              ⏸ Tiffin paused. Your wallet balance is safe.
            </Text>
          </View>
        )}

        {/* ─── Rate Today's Meal ─────────────────────────────── */}
        {(todayMenu.main_dish !== 'Holiday' && todayMenu.side_dish !== 'No Service' && !isPaused && currentPlan.id !== 'none') && (
        <View style={[styles.ratingCard, Shadows.subtle]}>
          <View style={styles.ratingHeader}>
            <Text style={styles.ratingTitle}>⭐ Aaj ka khana kaisa tha?</Text>
            {hasRatedToday && (
              <View style={styles.ratingDoneBadge}>
                <Text style={styles.ratingDoneBadgeText}>✓ Rated</Text>
              </View>
            )}
          </View>
          <Text style={styles.ratingMealName}>{todayMenu?.main_dish}</Text>


          {/* Stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRateMeal(star)}
                disabled={hasRatedToday}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Text style={[styles.starIcon, myRating >= star && styles.starActive]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
            {myRating > 0 && (
              <Text style={styles.ratingLabel}>
                {['', 'Bahut bura 😞', 'Theek tha 😐', 'Acha tha 😊', 'Bahut acha! 😄', 'Lajawaab! 🤩'][myRating]}
              </Text>
            )}
          </View>

          {/* Comment box — only show when not yet submitted */}
          {!hasRatedToday && myRating > 0 && (
            <TextInput
              style={styles.ratingInput}
              placeholder="Koi comment? (optional)"
              placeholderTextColor={Colors.textMuted}
              value={ratingComment}
              onChangeText={setRatingComment}
              maxLength={200}
            />
          )}
          {hasRatedToday && ratingComment ? (
            <Text style={styles.ratingCommentDisplay}>"{ratingComment}"</Text>
          ) : null}

          {/* Submit button */}
          {!hasRatedToday && (
            <TouchableOpacity
              style={[styles.ratingSubmitBtn, (myRating === 0 || ratingLoading) && styles.ratingSubmitBtnDisabled]}
              onPress={handleSubmitRating}
              disabled={myRating === 0 || ratingLoading}
            >
              <Text style={styles.ratingSubmitBtnText}>
                {ratingLoading ? 'Submitting...' : 'Rating Bhejo →'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        )}

        {/* Weekly Menu */}
        <Text style={styles.sectionTitle}>📅 Weekly Menu</Text>


        {/* Day selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
          {DAYS.map((day, i) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayChip,
                selectedDay === day && styles.dayChipActive,
              ]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[
                styles.dayChipText,
                selectedDay === day && styles.dayChipTextActive,
              ]}>
                {days[i]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Menu items */}
        {DAYS.map((day) => {
          const menu = menuData.find(m => m.day_name === day);
          if (!menu) return null;
          return (
            <View key={day} style={[
              styles.menuItem,
              selectedDay !== day && { opacity: 0.45 }
            ]}>
              <View style={styles.menuEmoji}>
                <Text style={{ fontSize: 24 }}>{menu.emoji}</Text>
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuDay}>{day}</Text>
                <Text style={styles.menuMain}>{menu.main_dish}</Text>
                <Text style={styles.menuSide}>{menu.side_dish}</Text>
              </View>
              {day === TODAY && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>Today</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Add-ons */}
        <Text style={styles.sectionTitle}>🍴 Add Extra Today</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.addonScroll}>
          {AppConfig.addOns.map((addon) => (
            <TouchableOpacity key={addon.id} style={styles.addonCard} onPress={handleOpenAddonModal}>
              <Text style={styles.addonEmoji}>{addon.icon}</Text>
              <Text style={styles.addonName}>{addon.name}</Text>
              <Text style={styles.addonPrice}>+₹{addon.price}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Community Feed Banner */}
        <TouchableOpacity style={styles.feedBanner} onPress={() => navigate('feed')}>
          <Text style={styles.feedBannerEmoji}>💬</Text>
          <View style={styles.feedBannerText}>
            <Text style={styles.feedBannerTitle}>Hostel Feed</Text>
            <Text style={styles.feedBannerSub}>See what neighbors are saying about today's meal →</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Reusable Bottom Bar */}
      <BottomBar active="home" navigate={navigate} />

      {/* Custom Bottom Sheet Modal Overlay for Add-ons */}
      {isAddonModalVisible && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackground} 
            activeOpacity={1} 
            onPress={() => setIsAddonModalVisible(false)} 
          />
          <View style={styles.modalSheet}>
            {/* Handle + Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>🛒 Extras Add Karo</Text>
              <Text style={styles.sheetSubtitle}>Ek saath kitni bhi cheez chunao — ek order mein jayega</Text>
            </View>

            {/* Grid of addon cards */}
            <ScrollView
              style={styles.sheetContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetGrid}
            >
              {AppConfig.addOns.map((addon) => {
                const qty = addonCounts[addon.id] || 0;
                const isSelected = qty > 0;
                return (
                  <View
                    key={addon.id}
                    style={[
                      styles.addonGridCard,
                      isSelected && styles.addonGridCardSelected,
                    ]}
                  >
                    <Text style={styles.addonGridEmoji}>{addon.icon}</Text>
                    <Text style={[styles.addonGridName, isSelected && styles.addonGridNameSelected]}>
                      {addon.name}
                    </Text>
                    <Text style={[styles.addonGridPrice, isSelected && styles.addonGridPriceSelected]}>
                      ₹{addon.price}
                    </Text>

                    {/* Quantity stepper */}
                    <View style={[styles.addonQtyRow, isSelected && styles.addonQtyRowSelected]}>
                      <TouchableOpacity
                        style={[styles.addonQtyBtn, !isSelected && styles.addonQtyBtnDisabled]}
                        onPress={() => updateAddonCount(addon.id, -1)}
                        disabled={qty === 0}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={[styles.addonQtyBtnText, !isSelected && { color: '#CBD5E1' }]}>−</Text>
                      </TouchableOpacity>
                      <Text style={[styles.addonQtyNum, isSelected && styles.addonQtyNumSelected]}>
                        {qty}
                      </Text>
                      <TouchableOpacity
                        style={styles.addonQtyBtn}
                        onPress={() => updateAddonCount(addon.id, 1)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={[styles.addonQtyBtnText, { color: isSelected ? '#fff' : Colors.primary }]}>+</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Selected badge */}
                    {isSelected && (
                      <View style={styles.addonSelectedBadge}>
                        <Text style={styles.addonSelectedBadgeText}>✓ {qty}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Footer */}
            <View style={styles.sheetFooter}>
              <View style={styles.sheetTotalRow}>
                <View>
                  <Text style={styles.sheetTotalLabel}>Total Extras</Text>
                  <Text style={styles.sheetTotalSub}>
                    {Object.values(addonCounts).reduce((a, b) => a + b, 0)} item(s) selected
                  </Text>
                </View>
                <Text style={styles.sheetTotalPrice}>₹{getAddonsTotal()}</Text>
              </View>

              <View style={styles.sheetBtnRow}>
                <TouchableOpacity 
                  style={styles.sheetCancelBtn} 
                  onPress={() => setIsAddonModalVisible(false)}
                >
                  <Text style={styles.sheetCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.sheetConfirmBtn, getAddonsTotal() === 0 && styles.sheetConfirmBtnDisabled]} 
                  onPress={handleConfirmAddons}
                  disabled={getAddonsTotal() === 0}
                >
                  <Text style={styles.sheetConfirmBtnText}>
                    {getAddonsTotal() === 0 ? 'Select items above' : `Order (₹${getAddonsTotal()})`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
    paddingBottom: 20,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textOnPrimary,
  },
  headerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  streakText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textOnPrimary,
  },
  walletBadge: {
    backgroundColor: Colors.walletGold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  walletText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: '#7B5200',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md },

  // Today's Meal Card
  mealCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  mealCardLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mealCardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  mealCardSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  mealEmoji: { fontSize: 52 },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  deliveryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginRight: 8,
  },
  deliveryText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  trackBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  trackStep: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  trackDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackLine: { flex: 1, height: 3, backgroundColor: Colors.border },
  trackStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  trackStatus: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.warning,
  },
  trackLink: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },

  // Plan Card
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  planLeft: {},
  planLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  planName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  planPrice: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
  pauseSection: { alignItems: 'center' },
  pauseLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  pauseAlert: {
    backgroundColor: '#FFF8E7',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.walletGold,
  },
  pauseAlertText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },

  // Section
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },

  // Day selector
  dayScroll: { marginBottom: Spacing.sm },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dayChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayChipText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  dayChipTextActive: { color: Colors.textOnPrimary },

  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: 8,
    ...Shadows.subtle,
  },
  menuEmoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF4F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuInfo: { flex: 1 },
  menuDay: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  menuMain: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
  menuSide: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  todayBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadgeText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.textOnPrimary,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Add-ons
  addonScroll: { marginBottom: Spacing.md },
  addonCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 90,
    ...Shadows.subtle,
  },
  addonEmoji: { fontSize: 28, marginBottom: 4 },
  addonName: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  addonPrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },

  // Feed Banner
  feedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
    ...Shadows.subtle,
  },
  feedBannerEmoji: { fontSize: 28 },
  feedBannerText: { flex: 1 },
  feedBannerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  feedBannerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 20,
    paddingTop: 10,
    ...Shadows.card,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabIcon: { fontSize: 22 },
  tabLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 3,
  },
  
  // Custom Modal Overlay Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    zIndex: 9999,
    elevation: 9999,
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '82%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  sheetSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sheetItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetItemEmoji: {
    fontSize: 28,
  },
  sheetItemName: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  sheetItemPrice: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.primary,
    marginTop: 1,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  qtyBtnDisabled: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    boxShadow: 'none',
  },
  qtyBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  qtyText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    minWidth: 18,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  sheetFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sheetTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTotalLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sheetTotalPrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: Colors.primary,
  },
  sheetBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sheetCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sheetConfirmBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetConfirmBtnDisabled: {
    backgroundColor: Colors.border,
  },
  sheetConfirmBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: Colors.textOnPrimary,
  },
  sheetTotalSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // ── Addon Grid Card Styles ──
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 14,
    paddingBottom: 4,
  },
  addonGridCard: {
    width: '47%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden' as any,
  },
  addonGridCardSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  addonGridEmoji: {
    fontSize: 34,
    marginBottom: 6,
  },
  addonGridName: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 3,
  },
  addonGridNameSelected: {
    color: '#15803D',
  },
  addonGridPrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: Colors.primary,
    marginBottom: 10,
  },
  addonGridPriceSelected: {
    color: '#16A34A',
  },
  addonQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addonQtyRowSelected: {
    backgroundColor: '#22C55E',
  },
  addonQtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addonQtyBtnDisabled: {
    opacity: 0.4,
  },
  addonQtyBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  addonQtyNum: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    minWidth: 20,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  addonQtyNumSelected: {
    color: '#fff',
  },
  addonSelectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  addonSelectedBadgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: '#fff',
  },

  // ── Meal Rating Card ──
  ratingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  ratingDoneBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  ratingDoneBadgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    color: '#065F46',
  },
  ratingMealName: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  starIcon: {
    fontSize: 32,
    color: '#D1D5DB',
  },
  starActive: {
    color: '#F59E0B',
  },
  ratingLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  ratingInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    marginBottom: 12,
  },
  ratingCommentDisplay: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  ratingSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  ratingSubmitBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  ratingSubmitBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#fff',
  },
});

