import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Linking,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { AppConfig } from '../../constants/appConfig';
import { Screen } from '../../navigation/AppNavigator';
import { BottomBar } from './SubscriptionScreen';
import { CustomerMap } from '../CustomerMap';
import { api } from '../../lib/api';
import { socket } from '../../lib/socket';
import { showWebNotification } from '../../lib/notifications';
import { OrderTrackingSkeleton } from '../ui/SkeletonLoader';
import { DeliveryAnimation } from '../ui/DeliveryAnimation';

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

interface OrderTrackingScreenProps {
  navigate: (screen: Screen) => void;
  userName: string;
}

export const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({ navigate, userName }) => {
  const [currentStatus, setCurrentStatus] = useState(1); // 0=cooking, 1=packed, 2=out_for_delivery, 3=delivered
  const [orderId, setOrderId] = useState('TF-MOCK12');
  const [dbOrderId, setDbOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [activeOrderExists, setActiveOrderExists] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const getETASeconds = (status: number, destLat: number, destLng: number, rLat: number | null, rLng: number | null): number => {
    let startLat = restaurantLat;
    let startLng = restaurantLng;

    if (status === 2 && rLat !== null && rLng !== null) {
      startLat = rLat;
      startLng = rLng;
    }

    const distance = getDistanceFromLatLonInKm(startLat, startLng, destLat, destLng);
    let travelTime = distance * 4;
    if (distance > 5) {
      travelTime = 8; // standard fallback of 8 mins if distance is unreasonably large (likely testing from another location)
    }

    let totalMinutes = 0;
    if (status === 0) {
      totalMinutes = 15 + travelTime;
    } else if (status === 1) {
      totalMinutes = 5 + travelTime;
    } else if (status === 2) {
      totalMinutes = travelTime;
    } else {
      return 0;
    }

    return Math.round(totalMinutes * 60);
  };
  const [driverName, setDriverName] = useState('Assigning Rider...');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [restaurantLat, setRestaurantLat] = useState<number>(28.6139);
  const [restaurantLng, setRestaurantLng] = useState<number>(77.2090);
  const [destinationLat, setDestinationLat] = useState<number>(28.6200);
  const [destinationLng, setDestinationLng] = useState<number>(77.2100);
  const [hostelName, setHostelName] = useState<string>('');
  const [orderPlanType, setOrderPlanType] = useState<string>('standard');
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Haversine formula helpers
  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };

  const calculateDynamicETA = (): string => {
    if (currentStatus === 3) return 'Delivered';
    if (timeLeftSeconds === null || timeLeftSeconds <= 0) return 'Arriving soon';
    const mins = Math.floor(timeLeftSeconds / 60);
    const secs = timeLeftSeconds % 60;
    const padSecs = secs < 10 ? `0${secs}` : secs;
    const padMins = mins < 10 ? `0${mins}` : mins;
    return `Delivery in ${padMins}m:${padSecs}s`;
  };

  const fetchLatestOrder = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/orders/myorders');
      if (data.success && data.data.length > 0) {
        const order = data.data[0];

        // Check if this order is active or recently delivered (last 1.5 hours)
        const orderDate = new Date(order.updatedAt || order.createdAt);
        const diffHours = (new Date().getTime() - orderDate.getTime()) / (1000 * 60 * 60);
        const isActive = order.status !== 'delivered' || diffHours < 1.5;

        if (!isActive) {
          if (isMounted.current) {
            setActiveOrderExists(false);
            setDbOrderId(null);
          }
          return;
        }

        if (!isMounted.current) return;
        setActiveOrderExists(true);
        setDbOrderId(order._id);
        const formattedId = `tf-${order._id.slice(-5).toLowerCase()}`;
        setOrderId(formattedId.toUpperCase());
        if (typeof window !== 'undefined' && window.history && window.history.pushState) {
          window.history.pushState(null, '', `/track-order/${formattedId}`);
        }
        setDriverName(order.rider?.name || 'Assigning Rider...');
        setDriverPhone(order.rider?.phone || '');
        setHostelName(order.profiles?.address_hostel || 'BH-3');

        let dstLat = destinationLat;
        let dstLng = destinationLng;
        // Prefer custom coordinates if they were set on the order
        if (order.latitude !== null && order.latitude !== undefined && order.longitude !== null && order.longitude !== undefined) {
          setDestinationLat(order.latitude);
          setDestinationLng(order.longitude);
          dstLat = order.latitude;
          dstLng = order.longitude;
        } else {
          const staticLoc = HOSTEL_COORDS[order.profiles?.address_hostel || 'BH-3'] || HOSTEL_COORDS['BH-3'];
          setDestinationLat(staticLoc.lat);
          setDestinationLng(staticLoc.lng);
          dstLat = staticLoc.lat;
          dstLng = staticLoc.lng;
        }

        if (order.restaurant && order.restaurant.latitude && order.restaurant.longitude) {
          setRestaurantLat(order.restaurant.latitude);
          setRestaurantLng(order.restaurant.longitude);
        } else {
          setRestaurantLat(28.6139); // central kitchen fallback
          setRestaurantLng(77.2090);
        }

        // Join order room for live GPS tracking updates
        socket.emit('join_order_room', order._id);
        
        const statusMap: Record<string, number> = {
          pending: 0,
          cooking: 0,
          packed: 1,
          out_for_delivery: 2,
          delivered: 3,
        };
        const stat = statusMap[order.status] ?? 0;
        setCurrentStatus(stat);
        setOrderPlanType(order.restaurant ? `custom:${order.restaurant.name}` : 'standard');
        setEmptyTiffinCollected(!!order.emptyTiffinCollected);

        // Calculate initial ETA seconds
        const rLat = order.riderLatitude || order.rider?.latitude || (dstLat - 0.005);
        const rLng = order.riderLongitude || order.rider?.longitude || (dstLng - 0.003);
        setTimeLeftSeconds(getETASeconds(stat, dstLat, dstLng, rLat, rLng));
      } else {
        if (isMounted.current) {
          setActiveOrderExists(false);
          setDbOrderId(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tracking order:', error);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const checkUserRating = async () => {
    try {
      const { data } = await api.get('/meal/my-rating');
      if (data.success && isMounted.current) {
        setHasRated(data.hasRated);
      }
    } catch (err) {
      console.error('Failed to check user rating:', err);
    }
  };

  // Ticking ETA Countdown
  useEffect(() => {
    if (timeLeftSeconds === null || timeLeftSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeftSeconds]);

  // Meal rating states
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [hasRated, setHasRated] = useState<boolean>(false);
  const [ratingSubmitting, setRatingSubmitting] = useState<boolean>(false);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);
  const [emptyTiffinCollected, setEmptyTiffinCollected] = useState<boolean>(false);

  // Rating Tags/Chips state
  const [foodChips, setFoodChips] = useState({
    tasty: false,
    spillProof: false,
    goodPortion: false,
    hotFresh: false,
  });

  const [riderChips, setRiderChips] = useState({
    fast: false,
    polite: false,
    correctDrop: false,
    goodComm: false,
  });

  const handleSubmitRating = async () => {
    if (ratingSubmitting) return;
    setRatingSubmitting(true);

    // Collect chips
    const selectedTags: string[] = [];
    if (foodChips.tasty) selectedTags.push("Tasty Food 😋");
    if (foodChips.spillProof) selectedTags.push("Spill-Proof Packaging 📦");
    if (foodChips.goodPortion) selectedTags.push("Perfect Portion 🍛");
    if (foodChips.hotFresh) selectedTags.push("Hot & Fresh 🔥");
    
    if (riderChips.fast) selectedTags.push("Fast Delivery ⚡");
    if (riderChips.polite) selectedTags.push("Polite Rider 🧑‍✈️");
    if (riderChips.correctDrop) selectedTags.push("Correct Dropoff 📍");
    if (riderChips.goodComm) selectedTags.push("Good Communication 📞");

    let finalComment = comment;
    if (selectedTags.length > 0) {
      finalComment = `[Tags: ${selectedTags.join(', ')}] ${comment}`;
    }

    try {
      const response = await api.post('/meal/rate', {
        rating,
        comment: finalComment,
        mealName: orderPlanType ? `${orderPlanType.toUpperCase()} Tiffin` : "Today's Tiffin",
        dayName: new Date().toLocaleDateString('en-US', { weekday: 'long' })
      });
      if (response.data.success) {
        setRatingSubmitted(true);
        setHasRated(true);
      }
    } catch (error) {
      console.error('Failed to submit rating:', error);
    } finally {
      setRatingSubmitting(false);
    }
  };

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: (currentStatus / (AppConfig.orderStatuses.length - 1)) * 100,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [currentStatus]);

  useEffect(() => {
    fetchLatestOrder();
    checkUserRating();

    const onStatusUpdate = (updateData: any) => {
      console.log('Socket Status Update:', updateData);
      const statusMap: Record<string, number> = {
        pending: 0,
        cooking: 0,
        packed: 1,
        out_for_delivery: 2,
        delivered: 3,
      };
      if (updateData.status) {
        const nextStat = statusMap[updateData.status] ?? 0;
        setCurrentStatus(nextStat);

        let dLat = destinationLat;
        let dLng = destinationLng;
        if (updateData.latitude !== null && updateData.latitude !== undefined && updateData.longitude !== null && updateData.longitude !== undefined) {
          dLat = updateData.latitude;
          dLng = updateData.longitude;
        }

        let rLat = driverLat;
        let rLng = driverLng;
        if (updateData.riderLatitude !== null && updateData.riderLatitude !== undefined) {
          rLat = updateData.riderLatitude;
          rLng = updateData.riderLongitude;
        }

        setTimeLeftSeconds(getETASeconds(nextStat, dLat, dLng, rLat, rLng));

        // Zomato/Swiggy style fallback Web Notifications on Web
        if (Platform.OS === 'web') {
          const statusPhrases: Record<string, string> = {
            cooking: "Aapka tiffin order accept ho gaya hai! Kitchen me fresh preparation shuru ho gayi hai. 👨‍🍳",
            packed: "Aapka tiffin pack ho chuka hai aur dispatch hone ke liye bilkul tayyar hai. 📦",
            out_for_delivery: "Aapka tiffin kitchen se dispatch ho gaya hai! Rider hostel ki taraf nikal chuka hai. 🛵",
            delivered: "Aapka tiffin safely deliver ho gaya hai. Enjoy your hot meal! 🎉"
          };
          const phrase = statusPhrases[updateData.status];
          if (phrase) {
            showWebNotification("Tiffin Order Status Update 🍱", phrase);
          }
        }
      }
      if (updateData.emptyTiffinCollected !== undefined) {
        setEmptyTiffinCollected(!!updateData.emptyTiffinCollected);
      }
      if (updateData.rider) {
        setDriverName(updateData.rider.name || 'Assigning Rider...');
        setDriverPhone(updateData.rider.phone || '');
      } else {
        setDriverName('Assigning Rider...');
        setDriverPhone('');
      }
      if (updateData.latitude !== null && updateData.latitude !== undefined && updateData.longitude !== null && updateData.longitude !== undefined) {
        setDestinationLat(updateData.latitude);
        setDestinationLng(updateData.longitude);
      }
      if (updateData.restaurant && updateData.restaurant.latitude && updateData.restaurant.longitude) {
        setRestaurantLat(updateData.restaurant.latitude);
        setRestaurantLng(updateData.restaurant.longitude);
      }
    };

    const onRiderLocationChanged = (loc: { latitude: number; longitude: number }) => {
      console.log('Live rider location from socket:', loc);
      setDriverLat(loc.latitude);
      setDriverLng(loc.longitude);
      setTimeLeftSeconds(getETASeconds(currentStatus, destinationLat, destinationLng, loc.latitude, loc.longitude));
    };

    socket.on('order_status_updated', onStatusUpdate);
    socket.on('rider_location_changed', onRiderLocationChanged);

    return () => {
      socket.off('order_status_updated', onStatusUpdate);
      socket.off('rider_location_changed', onRiderLocationChanged);
    };
  }, []);

  // Set initial driver coords fallback before first live update
  useEffect(() => {
    if (driverLat === null || driverLng === null) {
      setDriverLat(destinationLat - 0.005);
      setDriverLng(destinationLng - 0.003);
    }
  }, [destinationLat, destinationLng]);

  const handleSimulateStatus = async () => {
    const nextStatusIndex = Math.min(currentStatus + 1, 3);
    setCurrentStatus(nextStatusIndex);
  };

  const handleConfirmReceived = async () => {
    if (!dbOrderId) return;
    try {
      const { data } = await api.put(`/orders/${dbOrderId}/status`, { status: 'delivered' });
      if (data.success) {
        setCurrentStatus(3);
      }
    } catch (error) {
      console.error('Failed to confirm delivery:', error);
    }
  };

  if (loading) {
    return <OrderTrackingSkeleton />;
  }

  if (!activeOrderExists) {
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
          <Text style={styles.headerTitle}>Track Your Order</Text>
          <Text style={styles.headerSub}>No Active Delivery</Text>
        </LinearGradient>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛵💤</Text>
          <Text style={styles.emptyTitle}>No Active Delivery Right Now</Text>
          <Text style={styles.emptySub}>
            Aapka koi active tiffin order abhi delivery me nahi hai. Tracking tab shuru hoti hai jab kitchen aapka meal prepare karke dispatch karega!
          </Text>

          <TouchableOpacity style={styles.refreshBtn} onPress={fetchLatestOrder}>
            <Text style={styles.refreshBtnText}>🔄 Refresh Status</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.homeBtn} onPress={() => navigate('home')}>
            <Text style={styles.homeBtnText}>Back to Home Screen</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusColors = ['#F39C12', '#3498DB', '#9B59B6', '#2ECC71'];

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
        <Text style={styles.headerTitle}>Track Your Order</Text>
        <Text style={styles.headerSub}>Tonight's Tiffin — {AppConfig.deliveryTimeWindow}</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Status Steps */}
        <View style={[styles.card, Shadows.card]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Order Status</Text>
            {currentStatus < 3 && (
              <View style={{ backgroundColor: '#FFF0EA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md }}>
                <Text style={{ color: '#FF4500', fontFamily: Typography.fontFamily.semiBold, fontSize: 13 }}>
                  ⏳ {calculateDynamicETA()}
                </Text>
              </View>
            )}
          </View>

          {/* Progress bar background */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Status steps */}
          <View style={styles.stepsRow}>
            {AppConfig.orderStatuses.map((status, i) => {
              const isDone = i <= currentStatus;
              return (
                <View key={status.id} style={styles.stepItem}>
                  <View style={[
                    styles.stepDot,
                    isDone && { backgroundColor: statusColors[i], borderColor: statusColors[i] },
                  ]}>
                    <Text style={styles.stepIcon}>{status.icon}</Text>
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    isDone && { color: statusColors[i], fontFamily: Typography.fontFamily.semiBold },
                  ]}>
                    {status.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Current status highlight */}
          <View style={[styles.currentStatusBadge, { backgroundColor: statusColors[currentStatus] + '20' }]}>
            <Text style={[styles.currentStatusText, { color: statusColors[currentStatus] }]}>
              {AppConfig.orderStatuses[currentStatus].icon} Currently: {AppConfig.orderStatuses[currentStatus].label}
            </Text>
          </View>

          {(currentStatus === 1 || currentStatus === 2) && (
            <View style={{ marginTop: 16 }}>
              <DeliveryAnimation />
            </View>
          )}
        </View>

        {/* Map Tracking Card (Show when out for delivery) */}
        {currentStatus === 2 && (
          <View style={[styles.card, Shadows.card, { padding: 0, overflow: 'hidden' }]}>
            <Text style={[styles.sectionTitle, { padding: Spacing.md, marginBottom: 0 }]}>📍 Live Tiffin Tracking</Text>
            <View style={styles.mapWrap}>
              <CustomerMap
                driverLocation={driverLat && driverLng ? { lat: driverLat, lng: driverLng } : null}
                destinationLocation={{ lat: destinationLat, lng: destinationLng }}
                destinationName={hostelName || 'Your Hostel'}
              />
            </View>
            <View style={styles.etaRow}>
              <Text style={styles.etaTxt}>🛵 Arriving in: {calculateDynamicETA()}</Text>
              {driverLat && driverLng && (
                <Text style={styles.etaTime}>Live Coordinates: {driverLat.toFixed(5)}, {driverLng.toFixed(5)}</Text>
              )}
            </View>
          </View>
        )}

        {/* Delivery Agent Card */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.sectionTitle}>Delivery Agent</Text>
          <View style={styles.agentRow}>
            <View style={styles.agentAvatar}>
              <Text style={{ fontSize: 28 }}>🧑‍🦱</Text>
            </View>
            <View style={styles.agentInfo}>
              <Text style={styles.agentName}>{driverName}</Text>
              <Text style={styles.agentDetail}>Order ID: {orderId}</Text>
              <Text style={styles.agentDetail}>Scheduled: {AppConfig.deliveryTimeWindow}</Text>
            </View>
            {!!driverPhone && (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${driverPhone}`)}
              >
                <Text style={styles.callIcon}>📞</Text>
              </TouchableOpacity>
            )}
          </View>

          {emptyTiffinCollected && (
            <View style={styles.tiffinBadgeRow}>
              <Text style={styles.tiffinBadgeEmoji}>🍱</Text>
              <Text style={styles.tiffinBadgeTxt}>Yesterday's empty tiffin collected successfully!</Text>
            </View>
          )}
        </View>

        {/* Today's Delivery */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.sectionTitle}>Today's Delivery ({orderPlanType.toUpperCase()})</Text>
          {(AppConfig.plans.find(p => p.id === orderPlanType)?.items || ['Roti (4 pcs)', 'Dal Tadka', 'Sabji', 'Rice']).map((item, i) => (
            <View key={i} style={styles.deliveryItem}>
              <Text style={styles.deliveryItemDot}>•</Text>
              <Text style={styles.deliveryItemText}>{item}</Text>
            </View>
          ))}
        </View>



        {currentStatus === 3 && (
          <View style={styles.deliveredSection}>
            <View style={styles.deliveredBanner}>
              <Text style={styles.deliveredText}>🎉 Delivered! Enjoy your meal!</Text>
            </View>

            {/* Rating Card */}
            <View style={[styles.card, styles.ratingCard, Shadows.card]}>
              {ratingSubmitted || hasRated ? (
                <View style={styles.ratingDoneContainer}>
                  <Text style={styles.ratingDoneIcon}>⭐</Text>
                  <Text style={styles.ratingDoneTitle}>Review Submitted!</Text>
                  <Text style={styles.ratingDoneSub}>
                    Thank you for helping us maintain high quality standards. Your rating is live in the Admin Panel!
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.ratingTitle}>Rate Tonight's Tiffin & Service</Text>
                  <Text style={styles.ratingSubtitle}>Your feedback goes directly to our Kitchen and Delivery Team</Text>

                  <View style={styles.ratingInfoBox}>
                    <Text style={styles.ratingInfoTitle}>🎯 Ye Rating Kiske Liye Hai?</Text>
                    <Text style={styles.ratingInfoText}>
                      यह रेटिंग दो चीज़ों को बेहतर बनाने के लिए है:
                    </Text>
                    <View style={styles.ratingInfoRow}>
                      <Text style={styles.ratingInfoBullet}>🍱</Text>
                      <Text style={styles.ratingInfoDetail}>
                        <Text style={{ fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary }}>Meal Quality (Khana):</Text> खाने का स्वाद, पैकेजिंग और मात्रा (portion).
                      </Text>
                    </View>
                    <View style={styles.ratingInfoRow}>
                      <Text style={styles.ratingInfoRowSpacer}></Text>
                      <View style={styles.chipsRow}>
                        <TouchableOpacity
                          style={[styles.chipButton, foodChips.tasty && styles.chipActive]}
                          onPress={() => setFoodChips(prev => ({ ...prev, tasty: !prev.tasty }))}
                        >
                          <Text style={[styles.chipText, foodChips.tasty && styles.chipTextActive]}>😋 Tasty</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.chipButton, foodChips.spillProof && styles.chipActive]}
                          onPress={() => setFoodChips(prev => ({ ...prev, spillProof: !prev.spillProof }))}
                        >
                          <Text style={[styles.chipText, foodChips.spillProof && styles.chipTextActive]}>📦 Spill-Proof</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.chipButton, foodChips.goodPortion && styles.chipActive]}
                          onPress={() => setFoodChips(prev => ({ ...prev, goodPortion: !prev.goodPortion }))}
                        >
                          <Text style={[styles.chipText, foodChips.goodPortion && styles.chipTextActive]}>🍛 Portion</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.chipButton, foodChips.hotFresh && styles.chipActive]}
                          onPress={() => setFoodChips(prev => ({ ...prev, hotFresh: !prev.hotFresh }))}
                        >
                          <Text style={[styles.chipText, foodChips.hotFresh && styles.chipTextActive]}>🔥 Fresh</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={[styles.ratingInfoRow, { marginTop: 12 }]}>
                      <Text style={styles.ratingInfoBullet}>🛵</Text>
                      <Text style={styles.ratingInfoDetail}>
                        <Text style={{ fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary }}>Rider Service (Delivery):</Text> राइडर की समय पर डिलीवरी और व्यवहार (politeness).
                      </Text>
                    </View>
                    <View style={styles.ratingInfoRow}>
                      <Text style={styles.ratingInfoRowSpacer}></Text>
                      <View style={styles.chipsRow}>
                        <TouchableOpacity
                          style={[styles.chipButton, riderChips.fast && styles.chipActive]}
                          onPress={() => setRiderChips(prev => ({ ...prev, fast: !prev.fast }))}
                        >
                          <Text style={[styles.chipText, riderChips.fast && styles.chipTextActive]}>⚡ On Time</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.chipButton, riderChips.polite && styles.chipActive]}
                          onPress={() => setRiderChips(prev => ({ ...prev, polite: !prev.polite }))}
                        >
                          <Text style={[styles.chipText, riderChips.polite && styles.chipTextActive]}>🧑‍✈️ Polite</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.chipButton, riderChips.correctDrop && styles.chipActive]}
                          onPress={() => setRiderChips(prev => ({ ...prev, correctDrop: !prev.correctDrop }))}
                        >
                          <Text style={[styles.chipText, riderChips.correctDrop && styles.chipTextActive]}>📍 Dropoff</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.chipButton, riderChips.goodComm && styles.chipActive]}
                          onPress={() => setRiderChips(prev => ({ ...prev, goodComm: !prev.goodComm }))}
                        >
                          <Text style={[styles.chipText, riderChips.goodComm && styles.chipTextActive]}>📞 Comm</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.ratingSectionSubTitle, { marginTop: 16, marginBottom: 8 }]}>⭐ Overall Star Rating</Text>
                  
                  {/* Stars Row */}
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                        style={styles.starButton}
                      >
                        <Text style={[
                          styles.starText,
                          star <= rating ? styles.starSelected : styles.starUnselected
                        ]}>
                          ★
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Rating Description */}
                  <Text style={styles.ratingDesc}>
                    {rating === 1 && '🤢 Bad experience'}
                    {rating === 2 && '😕 Average / Disappointed'}
                    {rating === 3 && '😋 Good / Tasty meal'}
                    {rating === 4 && '🍲 Very Delicious / Satisfied'}
                    {rating === 5 && '👑 Masterpiece! Perfect!'}
                  </Text>

                  {/* Comment Input */}
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Tell us what you liked or how we can improve today's food/delivery..."
                    placeholderTextColor={Colors.textMuted}
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    numberOfLines={3}
                  />

                  {/* Submit button */}
                  <TouchableOpacity
                    style={styles.submitRatingBtn}
                    onPress={handleSubmitRating}
                    disabled={ratingSubmitting}
                  >
                    {ratingSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <LinearGradient
                        colors={['#FF6B35', '#FF1744']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitRatingGrad}
                      >
                        <Text style={styles.submitRatingTxt}>Submit Review & Rating</Text>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomBar active="home" navigate={navigate} />
    </View>
  );
};

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
  demoWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: Spacing.md,
  },
  demoWarningText: {
    color: '#D97706',
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
  },
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
  progressTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepIcon: { fontSize: 18 },
  stepLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  currentStatusBadge: {
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  currentStatusText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
  },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  agentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF4F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentInfo: { flex: 1 },
  agentName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  agentDetail: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callIcon: { fontSize: 20 },
  deliveryItem: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  deliveryItemDot: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
    fontSize: Typography.fontSize.base,
  },
  deliveryItemText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  simulateBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderStyle: 'dashed',
  },
  simulateBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  deliveredBanner: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  deliveredText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.accent,
  },
  mapWrap: {
    height: 220,
    backgroundColor: '#E2E8F0',
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  etaTxt: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
  },
  etaTime: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.textMuted,
  },
  confirmReceivedBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  confirmReceivedGrad: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmReceivedTxt: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
  },
  deliveredSection: {
    marginBottom: Spacing.md,
  },
  ratingCard: {
    marginTop: Spacing.sm,
    borderColor: '#FEE2E2',
    borderWidth: 1,
  },
  ratingDoneContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  ratingDoneIcon: {
    fontSize: 44,
    marginBottom: Spacing.sm,
  },
  ratingDoneTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: '#059669',
    marginBottom: 4,
  },
  ratingDoneSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    lineHeight: 18,
  },
  ratingTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  ratingSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  starButton: {
    padding: 6,
  },
  starText: {
    fontSize: 36,
  },
  starSelected: {
    color: '#F59E0B',
  },
  starUnselected: {
    color: '#E2E8F0',
  },
  ratingDesc: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  commentInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: Spacing.sm,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
  submitRatingBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  submitRatingGrad: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitRatingTxt: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
  },
  tiffinBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 12,
  },
  tiffinBadgeEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  tiffinBadgeTxt: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: '#065F46',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg + 2,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  refreshBtn: {
    backgroundColor: '#FFF0EA',
    borderColor: '#FFD8CC',
    borderWidth: 1.5,
    borderRadius: Radius.full,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: Spacing.md,
    width: '80%',
    alignItems: 'center',
  },
  refreshBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: '#FF4500',
  },
  homeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '80%',
    alignItems: 'center',
  },
  homeBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: '#FFFFFF',
  },
  ratingInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ratingInfoTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    marginBottom: 8,
  },
  ratingInfoText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  ratingInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  ratingInfoRowSpacer: {
    width: 24,
  },
  ratingInfoBullet: {
    fontSize: 14,
    marginRight: Spacing.xs,
    marginTop: 2,
  },
  ratingInfoDetail: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  ratingSectionSubTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chipButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#FFF0EA',
    borderColor: '#FFD8CC',
  },
  chipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#FF4500',
    fontFamily: Typography.fontFamily.bold,
  },
});
