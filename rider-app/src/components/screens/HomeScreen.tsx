import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Animated, Alert, Linking, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Colors } from '../../constants/colors';
import { Spacing, Radius, Shadows } from '../../constants/theme';
import { api } from '../../lib/api';
import { socket } from '../../lib/socket';
import { RiderMap } from '../RiderMap';
import { SwipeButton } from '../SwipeButton';
import { RiderHomeScreenSkeleton } from '../ui/ShimmerLoader';

const HOSTEL_COORDS: Record<string, { lat: number; lng: number }> = {
  'Boys Hostel 3':  { lat: 28.6200, lng: 77.2100 },
  'Girls Hostel 1': { lat: 28.6180, lng: 77.2060 },
  'Girls Hostel 2': { lat: 28.6190, lng: 77.2080 },
  'Boys Hostel 2':  { lat: 28.6210, lng: 77.2120 },
};

const DEMO_ORDERS = [
  { id: 'ord-1', status: 'out_for_delivery', plan_type: 'premium', profiles: { name: 'Rahul Sharma', phone: '9876543210', address_hostel: 'Boys Hostel 3', address_room: 'Room 204' }, addons: ['Extra Roti', 'Curd'] },
  { id: 'ord-2', status: 'out_for_delivery', plan_type: 'standard', profiles: { name: 'Priya Mehta', phone: '9123456789', address_hostel: 'Girls Hostel 1', address_room: 'Room 108' }, addons: [] },
  { id: 'ord-3', status: 'out_for_delivery', plan_type: 'basic', profiles: { name: 'Arjun Verma', phone: '9988776655', address_hostel: 'Boys Hostel 3', address_room: 'Room 312' }, addons: ['Salad'] },
  { id: 'ord-4', status: 'delivered', plan_type: 'premium', profiles: { name: 'Sneha Patel', phone: '9871234560', address_hostel: 'Girls Hostel 2', address_room: 'Room 205' }, addons: ['Gulab Jamun'] },
];

const PLAN_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  premium: { color: '#D97706', bg: '#FEF3C7', label: '⭐ PREMIUM' },
  standard: { color: '#2563EB', bg: '#EFF6FF', label: '🔵 STANDARD' },
  basic:    { color: '#6B7280', bg: '#F3F4F6', label: '⚪ BASIC' },
};

interface HomeScreenProps {
  rider: any;
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ rider, onLogout }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>(DEMO_ORDERS);
  const [activeTab, setActiveTab] = useState<'deliveries' | 'earnings'>('deliveries');
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [collectEmptyTiffin, setCollectEmptyTiffin] = useState(false);
  const [noTiffinToCollect, setNoTiffinToCollect] = useState(false);
  const [earningsData, setEarningsData] = useState<{ todayEarnings: number; tripsCount: number; trips: any[] }>({
    todayEarnings: 0,
    tripsCount: 0,
    trips: []
  });

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isSimulating, setIsSimulating] = useState(false);
  const simTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
      }
    };
  }, []);

  const startGpsSimulation = (destCoords: { lat: number; lng: number }, orderId: string) => {
    if (isSimulating) {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
      }
      setIsSimulating(false);
      return;
    }

    const startLat = 28.6139;
    const startLng = 77.2090;
    const endLat = destCoords.lat;
    const endLng = destCoords.lng;
    
    // Curved route path bend coordinates
    const midLat = startLat + (endLat - startLat) * 0.45;
    const midLng = startLng + (endLng - startLng) * 0.65;
    
    const routeSegments: { lat: number; lng: number }[] = [];
    
    // Segment 1: from start to bend 1
    const steps1 = 4;
    for (let i = 0; i <= steps1; i++) {
      const t = i / steps1;
      routeSegments.push({
        lat: startLat + (midLat - startLat) * t,
        lng: startLng,
      });
    }
    
    // Segment 2: from bend 1 to bend 2
    const steps2 = 4;
    for (let i = 1; i <= steps2; i++) {
      const t = i / steps2;
      routeSegments.push({
        lat: midLat,
        lng: startLng + (midLng - startLng) * t,
      });
    }
    
    // Segment 3: from bend 2 to end
    const steps3 = 4;
    for (let i = 1; i <= steps3; i++) {
      const t = i / steps3;
      routeSegments.push({
        lat: midLat + (endLat - midLat) * t,
        lng: midLng + (endLng - midLng) * t,
      });
    }

    setIsSimulating(true);
    let stepIdx = 0;
    
    // Set initial position
    setRiderLocation(routeSegments[0]);
    socket.emit('update_rider_location', {
      orderId: orderId,
      latitude: routeSegments[0].lat,
      longitude: routeSegments[0].lng,
      riderId: rider.id || rider._id,
      riderName: rider.name,
      vehicle: rider.vehicle || ''
    });

    simTimerRef.current = setInterval(() => {
      stepIdx++;
      if (stepIdx >= routeSegments.length) {
        clearInterval(simTimerRef.current);
        setIsSimulating(false);
        Alert.alert('🏁 Destination Reached!', 'Rider has arrived at the hostel. Confirm the empty tiffin recovery check and swipe to complete delivery.');
        return;
      }

      const coord = routeSegments[stepIdx];
      setRiderLocation(coord);
      socket.emit('update_rider_location', {
        orderId: orderId,
        latitude: coord.lat,
        longitude: coord.lng,
        riderId: rider.id || rider._id,
        riderName: rider.name,
        vehicle: rider.vehicle || ''
      });
    }, 1500);
  };

  const pendingOrders = orders.filter(o => o.status === 'out_for_delivery' || o.status === 'cooking');
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const todayEarnings = earningsData.todayEarnings;

  // Pulse online dot
  useEffect(() => {
    if (!isOnline) { pulseAnim.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 2.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isOnline]);

  // GPS tracking
  useEffect(() => {
    let watcher: any = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setLocationGranted(true);
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setRiderLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 15 },
        async (loc) => {
          const pos = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setRiderLocation(pos);
          if (activeOrderId) {
            socket.emit('update_rider_location', {
              orderId: activeOrderId,
              latitude: pos.lat,
              longitude: pos.lng,
              riderId: rider.id || rider._id,
              riderName: rider.name,
              vehicle: rider.vehicle || ''
            });
          }
        }
      );
    })();
    return () => { if (watcher) watcher.remove(); };
  }, [activeOrderId]);

  // Socket and REST API sync
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchOrders(), fetchEarnings()]);
      } catch (e) {
        console.error('Failed initial load:', e);
      } finally {
        setLoading(false);
      }
    };
    initData();
    
    socket.on('order_status_updated', () => {
      fetchOrders();
      fetchEarnings();
    });

    const interval = setInterval(() => {
      fetchOrders();
      fetchEarnings();
    }, 10000);

    return () => {
      socket.off('order_status_updated');
      clearInterval(interval);
    };
  }, [rider.id]);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/rider/orders');
      if (data.success) {
        const normalized = data.data.map((o: any) => ({ ...o, id: o._id || o.id }));
        setOrders(normalized);
      }
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    }
  };

  const fetchEarnings = async () => {
    try {
      const { data } = await api.get('/rider/earnings');
      if (data.success) {
        setEarningsData({
          todayEarnings: data.todayEarnings,
          tripsCount: data.tripsCount,
          trips: data.trips
        });
      }
    } catch (e) {
      console.error('Failed to fetch earnings:', e);
    }
  };

  const openMaps = (hostel: string, customLat?: number, customLng?: number) => {
    const c = (customLat && customLng)
      ? { lat: customLat, lng: customLng }
      : HOSTEL_COORDS[hostel] || { lat: 28.6139, lng: 77.2090 };
    const label = encodeURIComponent(hostel);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${c.lat},${c.lng}`,
      android: `geo:${c.lat},${c.lng}?q=${c.lat},${c.lng}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}&travelmode=driving`,
    });
    Linking.openURL(url!).catch(() => Alert.alert('Error', 'Cannot open Maps.'));
  };

  const markDelivered = async (orderId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const { data } = await api.put(`/orders/${orderId}/status`, { 
        status: 'delivered',
        emptyTiffinCollected: collectEmptyTiffin && !noTiffinToCollect
      });
      if (data.success) {
        setActiveOrderId(null);
        setCollectEmptyTiffin(false);
        setNoTiffinToCollect(false);
        fetchOrders();
        fetchEarnings();
      } else {
        Alert.alert('Error', 'Could not update delivery status. Try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not update delivery status. Try again.');
    }
  };

  const toggleOnline = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const newStatus = !isOnline;
    try {
      const { data } = await api.put('/rider/status', { isOnline: newStatus });
      if (data.success) {
        setIsOnline(newStatus);
      }
    } catch (e) {
      console.error('Failed to toggle status on server:', e);
      setIsOnline(newStatus);
    }
  };

  // Group by hostel
  const grouped: Record<string, any[]> = {};
  pendingOrders.forEach(o => {
    const h = o.profiles?.address_hostel || 'Unknown Hostel';
    if (!grouped[h]) grouped[h] = [];
    grouped[h].push(o);
  });

  const activeOrder = orders.find(o => o.id === activeOrderId);

  if (loading && !activeOrderId) {
    return <RiderHomeScreenSkeleton />;
  }

  if (activeTab === 'deliveries' && activeOrderId && activeOrder) {
    const pc = PLAN_CONFIG[activeOrder.plan_type] || PLAN_CONFIG.basic;
    const destCoords = (activeOrder.latitude && activeOrder.longitude)
      ? { lat: activeOrder.latitude, lng: activeOrder.longitude }
      : (activeOrder.profiles?.latitude && activeOrder.profiles?.longitude)
        ? { lat: activeOrder.profiles.latitude, lng: activeOrder.profiles.longitude }
        : HOSTEL_COORDS[activeOrder.profiles?.address_hostel] || { lat: 28.6139, lng: 77.2090 };

    return (
      <View style={styles.navContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* Header */}
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.navBackBtn} onPress={() => setActiveOrderId(null)}>
            <Text style={styles.navBackBtnTxt}>← List</Text>
          </TouchableOpacity>
          <Text style={styles.navHeaderTitle}>Active Navigation</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Map */}
        <View style={styles.navMapContainer}>
          <RiderMap 
            riderLocation={riderLocation}
            destinationLocation={destCoords}
            destinationName={activeOrder.profiles?.address_hostel || 'Destination'}
          />
        </View>

        {/* Card Details */}
        <View style={styles.navCard}>
          <View style={styles.navCardIndicator} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Destination Hostel */}
            <View style={styles.navHostelRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.navHostelLabel}>DELIVER TO</Text>
                <Text style={styles.navHostelName}>{activeOrder.profiles?.address_hostel}</Text>
                <Text style={styles.navRoomNo}>📍 {activeOrder.profiles?.address_room}</Text>
              </View>
              <View style={[styles.planTag, { backgroundColor: pc.bg, alignSelf: 'flex-start' }]}>
                <Text style={[styles.planTagTxt, { color: pc.color }]}>{pc.label}</Text>
              </View>
            </View>

            {/* Student Info */}
            <View style={styles.navStudentBox}>
              <View style={styles.navStudentRow}>
                <View style={styles.navAvatar}>
                  <Text style={styles.navAvatarTxt}>{(activeOrder.profiles?.name || 'S')[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.navStudentName}>{activeOrder.profiles?.name}</Text>
                  <Text style={styles.navStudentSubtitle}>Tiffin Customer</Text>
                </View>
              </View>

              {/* Add-ons list if any */}
              {activeOrder.addons && activeOrder.addons.length > 0 && (
                <View style={styles.navAddonsRow}>
                  {activeOrder.addons.map((a: string, idx: number) => (
                    <View key={idx} style={styles.navAddonChip}>
                      <Text style={styles.navAddonTxt}>+ {a}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Action buttons */}
            <View style={styles.navActionRow}>
              <TouchableOpacity 
                style={[styles.navCallBtn, { flex: 1 }]} 
                onPress={() => Linking.openURL(`tel:${activeOrder.profiles?.phone || ''}`)}
              >
                <Text style={styles.navCallBtnTxt}>📞 Call</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.navCallBtn, { flex: 1, backgroundColor: '#E2E8F0' }]} 
                onPress={() => openMaps(
                  activeOrder.profiles?.address_hostel || 'Destination',
                  activeOrder.latitude || activeOrder.profiles?.latitude,
                  activeOrder.longitude || activeOrder.profiles?.longitude
                )}
              >
                <Text style={[styles.navCallBtnTxt, { color: '#1E293B' }]}>🗺️ Maps</Text>
              </TouchableOpacity>
            </View>

            {/* GPS Simulation Controller Panel */}
            <View style={{ marginTop: 16, backgroundColor: isSimulating ? '#FFFBEB' : '#F8FAFC', borderWidth: 1, borderColor: isSimulating ? '#FEF3C7' : '#E2E8F0', padding: 12, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: isSimulating ? '#D97706' : '#475569', marginBottom: 4, fontWeight: '700' }}>
                {isSimulating ? '⚡ GPS Simulation Active' : '🧭 Route GPS Simulator'}
              </Text>
              <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center', marginBottom: 10, lineHeight: 16 }}>
                {isSimulating 
                  ? 'Moving rider step-by-step along the road bends. The student app map will update live.'
                  : 'Start a step-by-step route navigation simulation to test real-time coordinate updates.'}
              </Text>
              <TouchableOpacity
                onPress={() => startGpsSimulation(destCoords, activeOrder.id)}
                style={{
                  backgroundColor: isSimulating ? '#EF4444' : '#10B981',
                  paddingHorizontal: 20,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>
                  {isSimulating ? '⏹️ Stop Simulation' : '🚀 Start Simulation'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tiffin Recovery Checkboxes (Only for Tiffin Subscription orders) */}
            {activeOrder.isTiffinOrder ? (
              <>
                {/* Checkbox 1: Collected */}
                <TouchableOpacity 
                  style={styles.checkboxRow} 
                  onPress={() => {
                    setCollectEmptyTiffin(!collectEmptyTiffin);
                    setNoTiffinToCollect(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, collectEmptyTiffin && styles.checkboxSelected]}>
                    {collectEmptyTiffin && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Yesterday's empty tiffin box collected? 🍱</Text>
                </TouchableOpacity>

                {/* Checkbox 2: No box to collect */}
                <TouchableOpacity 
                  style={[styles.checkboxRow, { marginTop: 8 }]} 
                  onPress={() => {
                    setNoTiffinToCollect(!noTiffinToCollect);
                    setCollectEmptyTiffin(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, noTiffinToCollect && styles.checkboxSelected]}>
                    {noTiffinToCollect && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>No tiffin box to collect (first delivery / paused) 🚫</Text>
                </TouchableOpacity>

                {/* Complete Delivery Swipe Button */}
                <View style={{ marginTop: 12 }}>
                  <SwipeButton
                    title={collectEmptyTiffin || noTiffinToCollect ? "Swipe to Confirm Delivery >>" : "🔒 Tiffin status check required"}
                    onSwipeComplete={() => markDelivered(activeOrder.id)}
                    disabled={!collectEmptyTiffin && !noTiffinToCollect}
                    color="#059669"
                  />
                </View>
              </>
            ) : (
              /* Non-tiffin Restaurant orders do not require any collection */
              <View style={{ marginTop: 12 }}>
                <SwipeButton
                  title="Swipe to Confirm Delivery >>"
                  onSwipeComplete={() => markDelivered(activeOrder.id)}
                  disabled={false}
                  color="#059669"
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* ── PREMIUM RED HEADER ── */}
      <LinearGradient
        colors={['#EF4444', '#DC2626', '#B91C1C']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Decorative circles */}
        <View style={styles.decoBig} />
        <View style={styles.decoSmall} />

        {/* Top row */}
        <View style={styles.headerTop}>
          <View style={styles.riderRow}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarTxt}>{(rider.name || 'R')[0]}</Text>
            </View>
            <View>
              <Text style={styles.riderName}>{rider.name || 'Rider'}</Text>
              <Text style={styles.vehicleNo}>🏍️  {rider.vehicle || 'DL 12 XX 0000'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutTxt}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* GPS live location chip */}
        <View style={styles.gpsChip}>
          <View style={[styles.gpsDot, { backgroundColor: locationGranted ? '#4ADE80' : '#FCD34D' }]} />
          <Text style={styles.gpsTxt}>
            {locationGranted
              ? riderLocation
                ? `📍 ${riderLocation.lat.toFixed(5)}, ${riderLocation.lng.toFixed(5)}`
                : '📍 Fetching location...'
              : '⚠️ Enable location for tracking'}
          </Text>
        </View>

        {/* Online toggle */}
        <TouchableOpacity style={styles.onlineToggle} onPress={toggleOnline} activeOpacity={0.85}>
          <View style={styles.onlineDotContainer}>
            {isOnline && (
              <Animated.View style={[styles.onlinePulse, { transform: [{ scale: pulseAnim }] }]} />
            )}
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#4ADE80' : '#9CA3AF' }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.onlineStatusTxt, { color: isOnline ? '#4ADE80' : 'rgba(255,255,255,0.6)' }]}>
              {isOnline ? 'YOU ARE ONLINE' : 'YOU ARE OFFLINE'}
            </Text>
            <Text style={styles.onlineSubTxt}>
              {isOnline ? 'Accepting new orders' : 'Tap to start accepting orders'}
            </Text>
          </View>
          <View style={[styles.togglePill, { backgroundColor: isOnline ? '#4ADE80' : 'rgba(255,255,255,0.15)' }]}>
            <Text style={[styles.togglePillTxt, { color: isOnline ? '#fff' : 'rgba(255,255,255,0.7)' }]}>
              {isOnline ? 'GO OFF' : 'GO ON'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { emoji: '📦', val: String(pendingOrders.length), label: 'Pending' },
            { emoji: '✅', val: String(deliveredOrders.length), label: 'Done' },
            { emoji: '💰', val: `₹${todayEarnings}`, label: "Today's Pay", green: true },
          ].map((s, i) => (
            <View key={i} style={[styles.statCell, i < 2 && styles.statCellBorder]}>
              <Text style={{ fontSize: 18, marginBottom: 2 }}>{s.emoji}</Text>
              <Text style={[styles.statVal, s.green && { color: '#4ADE80' }]}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── TABS ── */}
      <View style={styles.tabBar}>
        {(['deliveries', 'earnings'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabTxt, activeTab === tab && styles.tabTxtActive]}>
              {tab === 'deliveries' ? `📦 Deliveries (${pendingOrders.length})` : '💰 Earnings'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── SCROLL CONTENT ── */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.md }}>

        {activeTab === 'deliveries' ? (
          Object.keys(grouped).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 64 }}>🎉</Text>
              <Text style={styles.emptyTitle}>All Delivered!</Text>
              <Text style={styles.emptyText}>Excellent work today. Check your earnings →</Text>
            </View>
          ) : (
            Object.entries(grouped).map(([hostel, list]) => (
              <View key={hostel} style={styles.hostelBlock}>
                {/* Hostel header */}
                <View style={styles.hostelHeader}>
                  <View style={styles.hostelTitleRow}>
                    <Text style={styles.hostelEmoji}>🏢</Text>
                    <Text style={styles.hostelName}>{hostel}</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeTxt}>{list.length} tiffin</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.navigateBtn} onPress={() => {
                    if (list.length > 0) {
                      setActiveOrderId(list[0].id);
                    }
                  }}>
                    <LinearGradient
                      colors={['#EF4444', '#F97316']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.navigateBtnGrad}
                    >
                      <Text style={styles.navigateBtnTxt}>🧭 Navigate</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Order cards */}
                {list.map(order => {
                  const pc = PLAN_CONFIG[order.plan_type] || PLAN_CONFIG.basic;
                  return (
                    <View key={order.id} style={styles.orderCard}>
                      {/* Left red stripe */}
                      <View style={styles.cardStripe} />

                      <View style={{ flex: 1 }}>
                        {/* Name + Plan */}
                        <View style={styles.cardTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.studentName}>{order.profiles?.name || 'Student'}</Text>
                            <Text style={styles.roomNo}>📍 {order.profiles?.address_room}</Text>
                          </View>
                          <View style={[styles.planTag, { backgroundColor: pc.bg }]}>
                            <Text style={[styles.planTagTxt, { color: pc.color }]}>{pc.label}</Text>
                          </View>
                        </View>

                        {/* Add-ons */}
                        {order.addons && order.addons.length > 0 && (
                          <View style={styles.addonChips}>
                            {order.addons.map((a: string, idx: number) => (
                              <View key={idx} style={styles.addonChip}>
                                <Text style={styles.addonChipTxt}>+ {a}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Divider */}
                        <View style={styles.divider} />

                        {/* Action buttons */}
                        <View style={styles.btnsRow}>
                          <TouchableOpacity
                            style={styles.callBtn}
                            onPress={() => Linking.openURL(`tel:${order.profiles?.phone || ''}`)}
                          >
                            <Text style={styles.callBtnTxt}>📞 Call</Text>
                          </TouchableOpacity>
                          <View style={{ flex: 1 }}>
                            <SwipeButton 
                              title="Swipe to Start >>"
                              onSwipeComplete={() => setActiveOrderId(order.id)}
                              color="#EF4444"
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )
        ) : (
          /* ── EARNINGS TAB ── */
          <View>
            {/* Hero earnings card */}
            <LinearGradient
              colors={['#059669', '#10B981']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.earningCard}
            >
              <View style={styles.earningDecoCircle} />
              <Text style={styles.earningLabel}>TODAY'S TOTAL EARNINGS</Text>
              <Text style={styles.earningAmount}>₹{todayEarnings}</Text>
              <Text style={styles.earningBreakdown}>{deliveredOrders.length} deliveries × ₹15 per delivery</Text>
            </LinearGradient>

            <Text style={styles.sectionTitle}>Completed Deliveries</Text>

            {deliveredOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 44 }}>📦</Text>
                <Text style={styles.emptyText}>No completed deliveries yet.</Text>
              </View>
            ) : (
              deliveredOrders.map((o, i) => (
                <View key={o.id} style={styles.completedCard}>
                  <View style={styles.completedIndex}>
                    <Text style={styles.completedIndexTxt}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.completedName}>{o.profiles?.name || 'Student'}</Text>
                    <Text style={styles.completedAddr}>{o.profiles?.address_hostel} · {o.profiles?.address_room}</Text>
                  </View>
                  <Text style={styles.completedPay}>+₹15</Text>
                </View>
              ))
            )}
            <View style={{ height: 40 }} />
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: { paddingTop: 52, paddingHorizontal: Spacing.md, paddingBottom: 16, overflow: 'hidden' },
  decoBig: {
    position: 'absolute', top: -50, right: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decoSmall: {
    position: 'absolute', bottom: -20, left: -20,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarWrap: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 20, fontWeight: '800', color: '#fff' },
  riderName: { fontSize: 16, fontWeight: '800', color: '#fff' },
  vehicleNo: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  logoutBtn: {
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  logoutTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // GPS chip
  gpsChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 10,
  },
  gpsDot: { width: 7, height: 7, borderRadius: 4 },
  gpsTxt: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  // Online toggle
  onlineToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: Radius.lg,
    padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  onlineDotContainer: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  onlinePulse: {
    position: 'absolute', width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#4ADE80', opacity: 0.25,
  },
  onlineDot: { width: 13, height: 13, borderRadius: 7 },
  onlineStatusTxt: { fontSize: 13, fontWeight: '800' },
  onlineSubTxt: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  togglePill: { borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  togglePillTxt: { fontSize: 11, fontWeight: '800' },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statCellBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)' },
  statVal: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 },

  // Tabs
  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.primary },
  tabTxt: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTxtActive: { color: Colors.primary, fontWeight: '700' },

  scroll: { flex: 1 },

  // Hostel section
  hostelBlock: { marginBottom: 20 },
  hostelHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  hostelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hostelEmoji: { fontSize: 16 },
  hostelName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  countBadge: {
    backgroundColor: '#FEE2E2', borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  countBadgeTxt: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  navigateBtn: { borderRadius: Radius.md, overflow: 'hidden' },
  navigateBtnGrad: { paddingHorizontal: 12, paddingVertical: 7 },
  navigateBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Order card (white)
  orderCard: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardStripe: { width: 4, backgroundColor: Colors.primary },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, paddingBottom: 8 },
  studentName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  roomNo: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  planTag: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  planTagTxt: { fontSize: 10, fontWeight: '800' },
  addonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingHorizontal: 12, marginBottom: 8 },
  addonChip: {
    backgroundColor: '#FFF5F5', borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#FECACA',
  },
  addonChipTxt: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.surfaceBorder, marginHorizontal: 12 },
  btnsRow: { flexDirection: 'row', gap: 8, padding: 10 },
  callBtn: {
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 9, paddingHorizontal: 14,
  },
  callBtnTxt: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  deliverBtnGrad: { paddingVertical: 11, alignItems: 'center' },
  deliverBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  // Earnings tab
  earningCard: {
    borderRadius: Radius.xl, padding: 28, alignItems: 'center',
    marginBottom: Spacing.md, overflow: 'hidden',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  earningDecoCircle: {
    position: 'absolute', top: -30, right: -30,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  earningLabel: { fontSize: 11, color: '#A7F3D0', fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  earningAmount: { fontSize: 56, fontWeight: '900', color: '#fff' },
  earningBreakdown: { fontSize: 12, color: '#6EE7B7', marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  completedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.surfaceBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, elevation: 1,
  },
  completedIndex: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center', justifyContent: 'center',
  },
  completedIndexTxt: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary },
  completedName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  completedAddr: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  completedPay: { fontSize: 18, fontWeight: '900', color: Colors.online },

  // Active Navigation Styles
  navContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  navBackBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  navBackBtnTxt: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },
  navHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  navMapContainer: {
    height: 350,
    backgroundColor: '#E2E8F0',
  },
  navCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  navCardIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  navHostelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  navHostelLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  navHostelName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  navRoomNo: {
    fontSize: 14,
    color: '#475569',
    marginTop: 2,
    fontWeight: '600',
  },
  navStudentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
  },
  navStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  navAvatarTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
  },
  navStudentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  navStudentSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  navAddonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  navAddonChip: {
    backgroundColor: '#FFF5F5',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  navAddonTxt: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
  },
  navActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  navCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FFFFFF',
  },
  navCallBtnTxt: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 14,
  },
  navGoogleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#475569',
    backgroundColor: '#FFFFFF',
  },
  navGoogleBtnTxt: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 14,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
    flex: 1,
  },
});
