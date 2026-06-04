import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Animated,
  Easing,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { api } from '../../lib/api';
import { socket } from '../../lib/socket';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { Screen, User } from '../../navigation/AppNavigator';
import { BottomBar } from './SubscriptionScreen';
import { AppConfig } from '../../constants/appConfig';

interface ProfileScreenProps {
  user: User;
  navigate: (screen: Screen) => void;
  onLogout: () => void;
  cart?: Record<string, number>;
  setCart?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  activeRestaurant?: any;
  checkoutStep?: 'idle' | 'address' | 'payment' | 'scanning' | 'confirming';
  setCheckoutStep?: React.Dispatch<React.SetStateAction<'idle' | 'address' | 'payment' | 'scanning' | 'confirming'>>;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  navigate,
  onLogout,
  cart,
  setCart,
  activeRestaurant,
  checkoutStep,
  setCheckoutStep,
}) => {
  const [notificationsOn, setNotificationsOn] = useState(true);
  const screenWidth = Dimensions.get('window').width;

  // Unified modal state
  const [activeModal, setActiveModal] = useState<'cart' | 'address' | 'history' | 'vacation' | 'refer' | 'help' | 'terms' | 'rate' | 'vote' | null>(null);

  // Rate & Vote state (for profile sliders)
  const [profileRating, setProfileRating] = useState(0);
  const [profileReview, setProfileReview] = useState('');
  const [profileRated, setProfileRated] = useState(false);
  const [profileRatingLoading, setProfileRatingLoading] = useState(false);
  const [profilePoll, setProfilePoll] = useState<any>(null);
  const [profileVoted, setProfileVoted] = useState<'a' | 'b' | null>(null);
  const [slideAnim] = useState(new Animated.Value(screenWidth));
  const [backdropOpacity] = useState(new Animated.Value(0));

  // Data states
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);

  // Address states
  const [addressHostelState, setAddressHostelState] = useState(user.addressLine || 'BH-3');
  const [addressRoomState, setAddressRoomState] = useState(user.city || '');
  const [deliveryPhoneState, setDeliveryPhoneState] = useState(user.phone || '');
  const [savingAddress, setSavingAddress] = useState(false);

  // Vacation states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loadingVacation, setLoadingVacation] = useState(false);
  const [fetchVacationLoading, setFetchVacationLoading] = useState(true);
  const [vacations, setVacations] = useState<any[]>([]);
  const [isOnVacation, setIsOnVacation] = useState(false);

  // Fetch Order History
  const fetchOrderHistory = async () => {
    try {
      setLoadingOrders(true);
      const { data } = await api.get('/orders/myorders');
      if (data.success) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error('Error fetching order history in profile:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch Vacations
  const fetchMyVacations = async () => {
    try {
      setFetchVacationLoading(true);
      const { data } = await api.get('/vacation/my');
      if (data.success) {
        setVacations(data.data);
        setIsOnVacation(data.isOnVacation);
      }
    } catch (e) {
      console.log('Error fetching vacations:', e);
    } finally {
      setFetchVacationLoading(false);
    }
  };

  // Load basic details on mount
  useEffect(() => {
    fetchOrderHistory();
    fetchMyVacations();

    // Listen for vacation status updates from admin
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

  // Animate slide in when activeModal changes
  useEffect(() => {
    if (activeModal !== null) {
      slideAnim.setValue(screenWidth);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // Fetch fresh data when specific modals open
      if (activeModal === 'history') {
        fetchOrderHistory();
      } else if (activeModal === 'vacation') {
        fetchMyVacations();
      }
    }
  }, [activeModal]);

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: screenWidth,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveModal(null);
    });
  };

  // Quantity updates
  const updateCartQty = (itemId: string, diff: number) => {
    if (setCart) {
      setCart((prev) => {
        const current = prev[itemId] || 0;
        const next = Math.max(0, current + diff);
        return { ...prev, [itemId]: next };
      });
    }
  };

  const removeItemFromCart = (itemId: string) => {
    if (setCart) {
      setCart((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    }
  };

  // Save address callback
  const handleSaveAddress = async () => {
    if (!addressHostelState.trim() || !addressRoomState.trim()) {
      Alert.alert('Details Missing', 'Please enter both Hostel name and Room number.');
      return;
    }
    setSavingAddress(true);
    try {
      const { data } = await api.put('/auth/profile', {
        addressLine: addressHostelState.trim(),
        city: addressRoomState.trim(),
        phone: deliveryPhoneState.trim()
      });
      if (data.success) {
        Alert.alert('Address Saved!', 'Aapka delivery address update ho gaya hai.');
        user.addressLine = addressHostelState.trim();
        user.city = addressRoomState.trim();
        user.phone = deliveryPhoneState.trim();
        closeModal();
      }
    } catch (err: any) {
      Alert.alert('Failed to Save', err.response?.data?.message || 'Could not update address.');
    } finally {
      setSavingAddress(false);
    }
  };

  // Vacation Mode request
  const handleConfirmVacation = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Details Missing', 'Please select start and end dates.');
      return;
    }
    setLoadingVacation(true);
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
      setLoadingVacation(false);
    }
  };

  const handleCancelVacation = async (requestId: string) => {
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

  const menuItems = [
    {
      icon: '🛒',
      label: 'My Tiffin Cart / Basket',
      sub: 'View items ready for checkout',
      action: () => setActiveModal('cart')
    },
    {
      icon: '📍',
      label: 'Delivery Addresses',
      sub: 'Manage lunch & dinner addresses',
      action: () => {
        setAddressHostelState(user.addressLine || 'BH-3');
        setAddressRoomState(user.city || '');
        setDeliveryPhoneState(user.phone || '');
        setActiveModal('address');
      }
    },
    {
      icon: '📋',
      label: 'Past Order History',
      sub: 'View your previous tiffin orders',
      action: () => setActiveModal('history')
    },
    {
      icon: '🏖️',
      label: 'Vacation Mode',
      sub: 'Pause tiffin for specific dates',
      action: () => setActiveModal('vacation')
    },
    {
      icon: '🎁',
      label: 'Refer & Earn',
      sub: 'Invite friends, get 2 days free',
      action: () => setActiveModal('refer')
    },
    {
      icon: '⭐',
      label: "Rate Today's Meal",
      sub: 'Share your experience with the kitchen',
      action: () => {
        setProfileRating(0);
        setProfileReview('');
        setProfileRated(false);
        setActiveModal('rate');
      }
    },
    {
      icon: '🗳️',
      label: "Vote Next Week's Menu",
      sub: 'Pick your favourite dish for next week',
      action: () => {
        // Fetch poll
        api.get('/polls/active').then(r => {
          if (r.data?.success) {
            setProfilePoll(r.data.data);
            if (r.data.data.hasVoted) setProfileVoted(r.data.data.votedOption || 'a');
            else setProfileVoted(null);
          } else {
            setProfilePoll({ question: "What should be next week's Special?", option_a: 'Chole Bhature 🍛', option_b: 'Paneer Tikka 🧀', votes_a: 24, votes_b: 18 });
          }
        }).catch(() => {
          setProfilePoll({ question: "What should be next week's Special?", option_a: 'Chole Bhature 🍛', option_b: 'Paneer Tikka 🧀', votes_a: 24, votes_b: 18 });
        });
        setActiveModal('vote');
      }
    },
    {
      icon: '❓',
      label: 'Help & Support',
      sub: 'FAQs and customer support',
      action: () => setActiveModal('help')
    },
    {
      icon: '🛡️',
      label: 'Terms & Privacy Policy',
      sub: 'App usage terms & privacy',
      action: () => setActiveModal('terms')
    },
  ];

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <LinearGradient
        colors={[Colors.gradient.start, Colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerCircles}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥{user.streak || 0}</Text>
          </View>
        </View>

        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userPhone}>+91 {user.phone || '98765 43210'}</Text>

        {/* Plan + Wallet row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{currentPlan.name}</Text>
            <Text style={styles.statLabel}>Current Plan</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{user.walletBalance.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Wallet Balance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.streak || 0} Days</Text>
            <Text style={styles.statLabel}>Streak 🔥</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Active Cart Section */}
        {cart && Object.keys(cart).length > 0 && activeRestaurant && (
          <View style={[styles.card, Shadows.subtle, { padding: Spacing.md }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.base, color: Colors.textPrimary }}>
                🛒 Items in Basket
              </Text>
              <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xs, color: Colors.primary }}>
                {activeRestaurant.name}
              </Text>
            </View>
            
            {(Object.entries(cart) as [string, number][]).map(([itemId, qty]) => {
              const item = activeRestaurant.menu.find((m: any) => m.id === itemId);
              if (!item || qty === 0) return null;
              return (
                <View key={itemId} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm, color: Colors.textPrimary }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs, color: Colors.textSecondary }}>
                        ₹{item.price} each
                      </Text>
                    </View>
                  </View>

                  <View style={styles.qtyControlsRow}>
                    <TouchableOpacity onPress={() => updateCartQty(itemId, -1)} style={styles.qtyBtn}>
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyVal}>{qty}</Text>
                    <TouchableOpacity onPress={() => updateCartQty(itemId, 1)} style={styles.qtyBtn}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.sm, color: Colors.textPrimary, width: 60, textAlign: 'right' }}>
                    ₹{item.price * qty}
                  </Text>
                </View>
              );
            })}
            
            <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 12 }} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.sm, color: Colors.textSecondary }}>Total Amount:</Text>
              <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.base, color: Colors.primary }}>
                ₹{(Object.entries(cart) as [string, number][]).reduce((sum, [itemId, qty]) => {
                  const item = activeRestaurant.menu.find((m: any) => m.id === itemId);
                  return sum + (item ? item.price * qty : 0);
                }, 0)}
              </Text>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: Colors.primary,
                borderRadius: Radius.full,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                ...Shadows.subtle
              }}
              onPress={() => {
                if (setCheckoutStep) setCheckoutStep('address');
                navigate('restaurants');
              }}
            >
              <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xs, color: Colors.textOnPrimary }}>
                Go to Checkout ➡️
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigate('subscription')}>
            <Text style={styles.quickIcon}>💳</Text>
            <Text style={styles.quickLabel}>Change Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigate('wallet')}>
            <Text style={styles.quickIcon}>💰</Text>
            <Text style={styles.quickLabel}>Add Money</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigate('tracking')}>
            <Text style={styles.quickIcon}>🛵</Text>
            <Text style={styles.quickLabel}>Track Order</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications toggle */}
        <View style={[styles.card, Shadows.subtle]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.toggleIcon}>🔔</Text>
              <View>
                <Text style={styles.toggleLabel}>Delivery Notifications</Text>
                <Text style={styles.toggleSub}>Get alerts before delivery</Text>
              </View>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={setNotificationsOn}
              trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
              thumbColor={notificationsOn ? Colors.primary : Colors.textMuted}
            />
          </View>
        </View>

        {/* Menu Items */}
        <View style={[styles.card, Shadows.subtle]}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={item.action}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>🚪 Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Student Tiffin v1.0.0 • Made with ❤️</Text>

      </ScrollView>

      {/* Slide-in Unified Modals */}
      {activeModal !== null && (
        <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={styles.modalBackdropDismiss} activeOpacity={1} onPress={closeModal} />
          
          <Animated.View style={[styles.modalContentCard, { transform: [{ translateX: slideAnim }] }]}>
            
            {/* Modal Headers */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeModal === 'cart' && '🛒 My Tiffin Cart / Basket'}
                {activeModal === 'address' && '📍 Delivery Address Manager'}
                {activeModal === 'history' && '📋 Past Order History'}
                {activeModal === 'vacation' && '🏖️ Vacation Mode Manager'}
                {activeModal === 'refer' && '🎁 Refer & Earn Rewards'}
                {activeModal === 'help' && '❓ Support & FAQ'}
                {activeModal === 'terms' && '🛡️ Terms & Privacy Policy'}
                {activeModal === 'rate' && "⭐ Rate Today's Meal"}
                {activeModal === 'vote' && "🗳️ Vote Next Week's Menu"}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
                <Text style={{ fontSize: 20, color: '#64748B', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Body Container */}
            <View style={{ flex: 1 }}>

              {/* 1. Cart Modal Content */}
              {activeModal === 'cart' && (
                cart && Object.keys(cart).length > 0 && activeRestaurant ? (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartRestaurantName}>Ordering from: {activeRestaurant.name}</Text>
                    
                    <ScrollView style={styles.modalCartScroll} showsVerticalScrollIndicator={false}>
                      {(Object.entries(cart) as [string, number][]).map(([itemId, qty]) => {
                        const item = activeRestaurant.menu.find((m: any) => m.id === itemId);
                        if (!item || qty === 0) return null;
                        return (
                          <View key={itemId} style={styles.cartItemRow}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={styles.cartItemName} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                                <Text style={styles.cartItemPrice}>
                                  ₹{item.price} each
                                </Text>
                              </View>
                            </View>

                            <View style={styles.qtyControlsRow}>
                              <TouchableOpacity onPress={() => updateCartQty(itemId, -1)} style={styles.qtyBtn}>
                                <Text style={styles.qtyBtnText}>-</Text>
                              </TouchableOpacity>
                              <Text style={styles.qtyVal}>{qty}</Text>
                              <TouchableOpacity onPress={() => updateCartQty(itemId, 1)} style={styles.qtyBtn}>
                                <Text style={styles.qtyBtnText}>+</Text>
                              </TouchableOpacity>
                            </View>

                            <Text style={styles.cartItemSubtotal}>
                              ₹{item.price * qty}
                            </Text>

                            <TouchableOpacity onPress={() => removeItemFromCart(itemId)} style={styles.cartItemDeleteBtn}>
                              <Text style={{ fontSize: 16 }}>🗑️</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </ScrollView>

                    <View style={styles.modalCartFooter}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={styles.cartTotalLabel}>Subtotal:</Text>
                        <Text style={styles.cartTotalValue}>
                          ₹{(Object.entries(cart) as [string, number][]).reduce((sum, [itemId, qty]) => {
                            const item = activeRestaurant.menu.find((m: any) => m.id === itemId);
                            return sum + (item ? item.price * qty : 0);
                          }, 0)}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                          style={styles.clearCartBtn}
                          onPress={() => {
                            Alert.alert('Clear Cart?', 'Kya aap cart ke saare items delete karna chahte hain?', [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Clear All',
                                style: 'destructive',
                                onPress: () => {
                                  if (setCart) setCart({});
                                  closeModal();
                                }
                              }
                            ]);
                          }}
                        >
                          <Text style={styles.clearCartBtnText}>Clear Cart 🗑️</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.checkoutBtn}
                          onPress={() => {
                            closeModal();
                            if (setCheckoutStep) setCheckoutStep('address');
                            navigate('restaurants');
                          }}
                        >
                          <Text style={styles.checkoutBtnText}>Checkout ➡️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyCartContainer}>
                    <Text style={{ fontSize: 48, marginBottom: 16 }}>🛒</Text>
                    <Text style={styles.emptyCartText}>Aapka cart khali hai!</Text>
                    <Text style={styles.emptyCartSub}>Menu me jaakar tiffin add karein.</Text>
                    <TouchableOpacity
                      style={styles.browseBtn}
                      onPress={() => {
                        closeModal();
                        navigate('restaurants');
                      }}
                    >
                      <Text style={styles.browseBtnText}>Browse Restaurants 🍳</Text>
                    </TouchableOpacity>
                  </View>
                )
              )}

              {/* 2. Address Modal Content */}
              {activeModal === 'address' && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, paddingVertical: Spacing.sm }}>
                  <Text style={styles.addressLabel}>Select Hostel</Text>
                  <View style={styles.addressPickerRow}>
                    {['BH-1', 'BH-2', 'BH-3', 'GH-1', 'GH-2'].map((hostel) => (
                      <TouchableOpacity
                        key={hostel}
                        style={[
                          styles.addressPickerChip,
                          addressHostelState === hostel && styles.addressPickerChipSelected
                        ]}
                        onPress={() => setAddressHostelState(hostel)}
                      >
                        <Text style={[
                          styles.addressPickerChipText,
                          addressHostelState === hostel && styles.addressPickerChipTextSelected
                        ]}>
                          {hostel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.addressLabel}>Room Number</Text>
                  <TextInput
                    style={styles.addressInput}
                    placeholder="e.g. Room 204"
                    placeholderTextColor={Colors.textMuted}
                    value={addressRoomState}
                    onChangeText={setAddressRoomState}
                  />

                  <Text style={styles.addressLabel}>Delivery Contact Number</Text>
                  <TextInput
                    style={styles.addressInput}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={deliveryPhoneState}
                    onChangeText={(t) => setDeliveryPhoneState(t.replace(/[^0-9]/g, ''))}
                  />

                  <View style={{ height: Spacing.lg }} />

                  <TouchableOpacity
                    style={styles.saveAddressBtn}
                    onPress={handleSaveAddress}
                    disabled={savingAddress}
                  >
                    {savingAddress ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <LinearGradient
                        colors={['#FF6B35', '#FF1744']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.saveAddressGrad}
                      >
                        <Text style={styles.saveAddressTxt}>Save Address Details</Text>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* 3. Order History Modal Content */}
              {activeModal === 'history' && (
                <View style={{ flex: 1 }}>
                  {loadingOrders ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 40 }} />
                  ) : orders.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 50, marginBottom: 16 }}>🍱</Text>
                      <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.base, color: Colors.textSecondary }}>
                        No past orders found
                      </Text>
                      <Text style={{ fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginTop: 4 }}>
                        Aapke purane orders yahan dikhenge.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                      {orders.map((order) => {
                        const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        const statusColors: Record<string, string> = {
                          pending: '#F59E0B',
                          cooking: '#3B82F6',
                          packed: '#10B981',
                          out_for_delivery: '#8B5CF6',
                          delivered: '#10B981',
                          cancelled: '#EF4444'
                        };
                        return (
                          <View key={order._id} style={styles.historyCardItem}>
                            <View style={styles.historyCardHeader}>
                              <View>
                                <Text style={styles.historyCardId}>
                                  Order ID: #{order._id.slice(-6).toUpperCase()}
                                </Text>
                                <Text style={styles.historyCardDate}>{dateStr}</Text>
                              </View>
                              <View style={[styles.statusBadge, { backgroundColor: (statusColors[order.status] || '#6B7280') + '15' }]}>
                                <Text style={[styles.statusBadgeText, { color: statusColors[order.status] || '#6B7280' }]}>
                                  {order.status.toUpperCase().replace('_', ' ')}
                                </Text>
                              </View>
                            </View>

                            <View style={{ marginVertical: 8 }}>
                              {order.items.map((item: any, idx: number) => (
                                <Text key={idx} style={styles.historyCardMealItem}>
                                  🍱 {item.quantity}x {item.name}
                                </Text>
                              ))}
                              {order.addons && order.addons.length > 0 && (
                                <Text style={styles.historyCardAddons}>
                                  ➕ Addons: {order.addons.join(', ')}
                                </Text>
                              )}
                            </View>

                            <View style={styles.historyCardFooter}>
                              <Text style={styles.historyCardPayment}>
                                Paid via: {order.paymentMethod.toUpperCase()}
                              </Text>
                              <Text style={styles.historyCardTotal}>
                                Total: ₹{order.totalAmount}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* 4. Vacation Mode Modal Content */}
              {activeModal === 'vacation' && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {/* Vacation Info Card */}
                  <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                      💡 Vacation mode select karne par aapka tiffin delivery pause ho jayega aur us duration ke charges deduct nahi honge. Safe and free!
                    </Text>
                  </View>

                  {/* On vacation Banner */}
                  {isOnVacation && (
                    <View style={styles.vacationBanner}>
                      <Text style={styles.vacationBannerTxt}>🏖️ VACATION MODE ACTIVE</Text>
                    </View>
                  )}

                  {/* Form */}
                  <View style={styles.subFormCard}>
                    <Text style={styles.formSectionTitle}>📅 Select Dates</Text>
                    
                    <Text style={styles.addressLabel}>Start Date (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.addressInput}
                      placeholder="e.g. 2026-06-01"
                      placeholderTextColor={Colors.textMuted}
                      value={startDate}
                      onChangeText={setStartDate}
                    />

                    <Text style={styles.addressLabel}>End Date (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.addressInput}
                      placeholder="e.g. 2026-06-07"
                      placeholderTextColor={Colors.textMuted}
                      value={endDate}
                      onChangeText={setEndDate}
                    />

                    <Text style={styles.addressLabel}>Reason (Optional)</Text>
                    <TextInput
                      style={[styles.addressInput, { height: 60, textAlignVertical: 'top' }]}
                      placeholder="Going home for semester break..."
                      placeholderTextColor={Colors.textMuted}
                      multiline
                      value={reason}
                      onChangeText={setReason}
                    />

                    <View style={{ height: Spacing.md }} />

                    <TouchableOpacity
                      style={styles.saveAddressBtn}
                      onPress={handleConfirmVacation}
                      disabled={loadingVacation}
                    >
                      {loadingVacation ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <LinearGradient
                          colors={['#8B5CF6', '#6D28D9']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.saveAddressGrad}
                        >
                          <Text style={styles.saveAddressTxt}>Set Vacation Mode</Text>
                        </LinearGradient>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Active List */}
                  <Text style={styles.historyListTitle}>📋 Scheduled Vacations</Text>
                  {fetchVacationLoading ? (
                    <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
                  ) : vacations.length === 0 ? (
                    <View style={styles.emptyCardPlaceholder}>
                      <Text style={{ fontSize: 32, marginBottom: 8 }}>✈️</Text>
                      <Text style={{ fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.xs, color: Colors.textMuted }}>
                        No vacation scheduled
                      </Text>
                    </View>
                  ) : (
                    vacations.filter(v => v.status !== 'cancelled').map((trip, idx) => {
                      const tripColors: Record<string, string> = {
                        pending: '#F59E0B',
                        active: '#10B981',
                        completed: '#6B7280',
                      };
                      return (
                        <View key={trip._id || idx} style={styles.vacationItemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.vacationItemReason}>{trip.reason || 'Vacation Break'}</Text>
                            <Text style={styles.vacationItemDates}>{trip.startDate} to {trip.endDate}</Text>
                            <Text style={styles.vacationItemDays}>Duration: {trip.days} days</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            <View style={[styles.statusBadge, { backgroundColor: (tripColors[trip.status] || '#6B7280') + '20' }]}>
                              <Text style={[styles.statusBadgeText, { color: tripColors[trip.status] || '#6B7280' }]}>
                                {trip.status.toUpperCase()}
                              </Text>
                            </View>
                            {trip.status === 'pending' && trip._id && (
                              <TouchableOpacity style={styles.cancelVacBtn} onPress={() => handleCancelVacation(trip._id!)}>
                                <Text style={styles.cancelVacBtnTxt}>Cancel</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              )}

              {/* 5. Refer & Earn Modal Content */}
              {activeModal === 'refer' && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, paddingVertical: Spacing.sm }}>
                  <View style={styles.referCard}>
                    <Text style={{ fontSize: 50, marginBottom: 12 }}>🎁</Text>
                    <Text style={styles.referTitle}>Refer Friends & Earn Free Food!</Text>
                    <Text style={styles.referSub}>
                      Apne dosto ko invite karein. Jab vo koi subscription standard/premium active karenge, toh aap dono ko **2 Days Extra Free Tiffin** milega!
                    </Text>

                    <View style={styles.promoCodeContainer}>
                      <Text style={styles.promoCodeLabel}>YOUR REFERRAL CODE</Text>
                      <Text style={styles.promoCodeVal}>TIFFIN{user.phone ? user.phone.slice(-4) : 'FREE'}</Text>
                      <TouchableOpacity 
                        style={styles.copyBtn}
                        onPress={() => {
                          Alert.alert('Copied!', 'Referral code clipboard pe copy ho gaya.');
                        }}
                      >
                        <Text style={styles.copyBtnTxt}>Copy Code 📋</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.stepsContainer}>
                      <Text style={styles.stepsTitle}>How it works:</Text>
                      <Text style={styles.stepItem}>1️⃣ Share your referral code with friends.</Text>
                      <Text style={styles.stepItem}>2️⃣ Friend inputs code on signup/profile.</Text>
                      <Text style={styles.stepItem}>3️⃣ Once they buy a subscription, you both get 2 days credited!</Text>
                    </View>
                  </View>
                </ScrollView>
              )}

              {/* 6. Help & Support Modal Content */}
              {activeModal === 'help' && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  <Text style={styles.faqHeader}>Frequently Asked Questions (FAQs)</Text>
                  
                  <View style={styles.faqItem}>
                    <Text style={styles.faqQuestion}>Q: Tiffin delivery ka timing kya hai?</Text>
                    <Text style={styles.faqAnswer}>A: Lunch delivery dopahar 12:00 PM se 2:00 PM tak hoti hai. Dinner delivery shaam 7:30 PM se 9:30 PM tak hoti hai.</Text>
                  </View>

                  <View style={styles.faqItem}>
                    <Text style={styles.faqQuestion}>Q: Kya main daily meal pause kar sakta hoon?</Text>
                    <Text style={styles.faqAnswer}>A: Haan! Aap 'Vacation Mode' use karke select dates ke liye tiffin pause kar sakte hain. Aapka balance save rahega.</Text>
                  </View>

                  <View style={styles.faqItem}>
                    <Text style={styles.faqQuestion}>Q: Wallet recharge fail hone par kya karein?</Text>
                    <Text style={styles.faqAnswer}>A: Agar payment complete ho gayi hai aur wallet update nahi hua, toh correct UTR reference code ke saath support section mein screenshot submit karein.</Text>
                  </View>

                  <Text style={styles.faqHeader}>Contact Customer Support</Text>
                  
                  <View style={styles.supportContactCard}>
                    <Text style={styles.supportLabel}>📞 Phone Support:</Text>
                    <Text style={styles.supportVal}>+91 98765 43210</Text>
                    <Text style={styles.supportLabel}>📧 Email Support:</Text>
                    <Text style={styles.supportVal}>support@studenttiffin.com</Text>
                    <Text style={styles.supportSub}>Timing: 9:00 AM to 10:00 PM (Everyday)</Text>

                    <TouchableOpacity 
                      style={styles.chatSupportBtn}
                      onPress={() => {
                        Alert.alert('Chat Support', 'Connecting you with our support assistant...');
                      }}
                    >
                      <Text style={styles.chatSupportTxt}>💬 Start Live Chat Support</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}

              {/* 7. Terms & Privacy Modal Content */}
              {activeModal === 'terms' && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, paddingVertical: Spacing.sm }}>
                  <Text style={styles.termsTitleHeader}>1. Subscription & Deliveries</Text>
                  <Text style={styles.termsParagraph}>
                    Student Tiffin ensures daily delivery of fresh, hygienic meals under standard plans. Pausing plans is permitted up to 24 hours in advance via Vacation Mode. Cancelled or missed deliveries due to address changes not updated in time are not eligible for refunds.
                  </Text>

                  <Text style={styles.termsTitleHeader}>2. Wallet Refunds</Text>
                  <Text style={styles.termsParagraph}>
                    Funds added to Student Tiffin wallets are strictly virtual credits and non-refundable. They can only be spent on plan purchases or menu add-ons within the app.
                  </Text>

                  <Text style={styles.termsTitleHeader}>3. Privacy Policy</Text>
                  <Text style={styles.termsParagraph}>
                    We collect your hostel addresses, phone numbers, and coordinates strictly for delivery routing. We do not sell or share user data with any third-party marketing services.
                  </Text>

                  <View style={{ height: 40 }} />
                </ScrollView>
              )}

              {/* 8. Rate Today's Meal */}
              {activeModal === 'rate' && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: Spacing.sm, paddingBottom: 40 }}>
                  {profileRated ? (
                    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                      <Text style={{ fontSize: 56, marginBottom: 16 }}>🎉</Text>
                      <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: 20, color: '#1E293B', marginBottom: 8 }}>Thanks for rating!</Text>
                      <Text style={{ fontFamily: Typography.fontFamily.regular, fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 }}>Your feedback helps improve the kitchen. See you tomorrow!</Text>
                    </View>
                  ) : (
                    <View>
                      <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: 14, color: '#475569', marginBottom: 12 }}>How was today's meal?</Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
                        {[1,2,3,4,5].map(star => (
                          <TouchableOpacity key={star} onPress={() => setProfileRating(star)} activeOpacity={0.7}>
                            <Text style={{ fontSize: 44, color: star <= profileRating ? '#F59E0B' : '#CBD5E1' }}>★</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {profileRating > 0 && (
                        <Text style={{ fontFamily: Typography.fontFamily.semiBold, fontSize: 13, color: Colors.primary, marginBottom: 4 }}>
                          {['','Very bad 😞','Okay 😐','Good 😊','Very good! 😄','Amazing! 🤩'][profileRating]}
                        </Text>
                      )}
                      <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: 14, color: '#475569', marginTop: 20, marginBottom: 8 }}>Any comments? (optional)</Text>
                      <TextInput
                        style={{ borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: Typography.fontFamily.regular, fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.background, height: 100, textAlignVertical: 'top', marginBottom: 20 }}
                        placeholder="Share your experience..."
                        placeholderTextColor={Colors.textMuted}
                        value={profileReview}
                        onChangeText={setProfileReview}
                        multiline
                      />
                      <TouchableOpacity
                        style={{ backgroundColor: profileRating === 0 ? '#CBD5E1' : Colors.primary, borderRadius: Radius.full, paddingVertical: 14, alignItems: 'center' }}
                        disabled={profileRating === 0 || profileRatingLoading}
                        onPress={async () => {
                          setProfileRatingLoading(true);
                          try {
                            await api.post('/meal/rate', { rating: profileRating, comment: profileReview, mealName: "Today's Meal" });
                          } catch {}
                          setProfileRated(true);
                          setProfileRatingLoading(false);
                        }}
                      >
                        <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: 15, color: '#fff' }}>
                          {profileRatingLoading ? 'Submitting...' : '⭐ Post Rating'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              )}

              {/* 9. Vote Next Week's Menu */}
              {activeModal === 'vote' && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: Spacing.sm, paddingBottom: 40 }}>
                  {!profilePoll ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 40 }} />
                  ) : (() => {
                    const total = (profilePoll.votes_a || 0) + (profilePoll.votes_b || 0);
                    const pctA = total > 0 ? Math.round(((profilePoll.votes_a || 0) / total) * 100) : 50;
                    const pctB = 100 - pctA;
                    return (
                      <View>
                        <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: 16, color: '#1E293B', marginBottom: 6 }}>{profilePoll.question}</Text>
                        <Text style={{ fontFamily: Typography.fontFamily.regular, fontSize: 13, color: '#64748B', marginBottom: 20 }}>Your vote decides next week's menu!</Text>

                        {/* Option A */}
                        <TouchableOpacity
                          style={{ borderWidth: 1.5, borderColor: profileVoted === 'a' ? Colors.primary : '#E2E8F0', borderRadius: 14, padding: 16, backgroundColor: profileVoted === 'a' ? 'rgba(255,69,0,0.04)' : Colors.surface, marginBottom: 4 }}
                          onPress={() => {
                            if (profileVoted) return;
                            setProfileVoted('a');
                            setProfilePoll((p: any) => ({ ...p, votes_a: (p.votes_a || 0) + 1 }));
                            api.post('/polls/vote', { option: 'a' }).catch(() => {});
                          }}
                          disabled={!!profileVoted}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ fontFamily: Typography.fontFamily.semiBold, fontSize: 15, color: profileVoted === 'a' ? Colors.primary : '#1E293B', flex: 1 }}>{profilePoll.option_a}</Text>
                            <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: 18, color: Colors.primary }}>{pctA}%</Text>
                          </View>
                          <View style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                            <View style={{ height: '100%', width: `${pctA}%` as any, backgroundColor: Colors.primary, borderRadius: 4 }} />
                          </View>
                          {profileVoted === 'a' && <Text style={{ marginTop: 8, fontFamily: Typography.fontFamily.semiBold, fontSize: 12, color: Colors.primary }}>✓ Your vote</Text>}
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10, gap: 8 }}>
                          <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
                          <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: 13, color: '#94A3B8' }}>VS</Text>
                          <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
                        </View>

                        {/* Option B */}
                        <TouchableOpacity
                          style={{ borderWidth: 1.5, borderColor: profileVoted === 'b' ? Colors.primary : '#E2E8F0', borderRadius: 14, padding: 16, backgroundColor: profileVoted === 'b' ? 'rgba(255,69,0,0.04)' : Colors.surface, marginBottom: 4 }}
                          onPress={() => {
                            if (profileVoted) return;
                            setProfileVoted('b');
                            setProfilePoll((p: any) => ({ ...p, votes_b: (p.votes_b || 0) + 1 }));
                            api.post('/polls/vote', { option: 'b' }).catch(() => {});
                          }}
                          disabled={!!profileVoted}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ fontFamily: Typography.fontFamily.semiBold, fontSize: 15, color: profileVoted === 'b' ? Colors.primary : '#1E293B', flex: 1 }}>{profilePoll.option_b}</Text>
                            <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: 18, color: Colors.primary }}>{pctB}%</Text>
                          </View>
                          <View style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                            <View style={{ height: '100%', width: `${pctB}%` as any, backgroundColor: Colors.primary, borderRadius: 4 }} />
                          </View>
                          {profileVoted === 'b' && <Text style={{ marginTop: 8, fontFamily: Typography.fontFamily.semiBold, fontSize: 12, color: Colors.primary }}>✓ Your vote</Text>}
                        </TouchableOpacity>

                        <Text style={{ fontFamily: Typography.fontFamily.medium, fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 16 }}>🗳️ {total} students have voted</Text>

                        {profileVoted && (
                          <View style={{ marginTop: 16, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#86EFAC' }}>
                            <Text style={{ fontFamily: Typography.fontFamily.medium, fontSize: 13, color: '#166534', lineHeight: 20 }}>✅ Vote recorded! Results will be announced tomorrow.</Text>
                          </View>
                        )}
                      </View>
                    );
                  })()}
                </ScrollView>
              )}

            </View>

          </Animated.View>
        </Animated.View>
      )}

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
    overflow: 'hidden',
    position: 'relative',
  },
  headerCircles: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -60,
    right: -40,
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -40,
    left: -30,
  },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: Typography.fontSize['3xl'],
    color: Colors.textOnPrimary,
  },
  streakBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.walletGold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  streakText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: '#7B5200',
  },
  userName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textOnPrimary,
    marginBottom: 2,
  },
  userPhone: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textOnPrimary,
  },
  statLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md },

  // Quick buttons
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.md,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    ...Shadows.subtle,
  },
  quickIcon: { fontSize: 24, marginBottom: 4 },
  quickLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  toggleIcon: { fontSize: 22 },
  toggleLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  toggleSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  menuInfo: { flex: 1 },
  menuLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  menuSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  menuArrow: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 22,
    color: Colors.textMuted,
  },

  logoutBtn: {
    borderWidth: 1.5,
    borderColor: Colors.danger,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoutText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.danger,
  },
  version: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  qtyControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: Radius.full,
    padding: 2,
    marginRight: 8,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  qtyVal: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: '#FFFFFF',
    paddingHorizontal: 8,
  },

  // Modals Styles
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalBackdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContentCard: {
    backgroundColor: '#FAFAFA',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.md,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  modalTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartRestaurantName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  modalCartScroll: {
    flex: 1,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cartItemName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  cartItemPrice: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cartItemSubtotal: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    width: 60,
    textAlign: 'right',
  },
  cartItemDeleteBtn: {
    padding: 6,
    marginLeft: 4,
  },
  modalCartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: '#FAFAFA',
  },
  cartTotalLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  cartTotalValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.primary,
  },
  clearCartBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    borderRadius: Radius.full,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearCartBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.danger,
  },
  checkoutBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.subtle,
  },
  checkoutBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textOnPrimary,
  },
  emptyCartContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  emptyCartText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  emptyCartSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  browseBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 12,
    paddingHorizontal: 24,
    ...Shadows.subtle,
  },
  browseBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textOnPrimary,
  },
  
  // History list card styles
  historyCardItem: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  historyCardId: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  historyCardDate: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  statusBadgeText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
  },
  historyCardMealItem: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginVertical: 2,
  },
  historyCardAddons: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.primary,
    marginTop: 4,
  },
  historyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 8,
  },
  historyCardPayment: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
  },
  historyCardTotal: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },

  // Address Manager
  addressLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  addressInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: Spacing.sm,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  addressPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: Spacing.xs,
  },
  addressPickerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  addressPickerChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  addressPickerChipText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  addressPickerChipTextSelected: {
    color: Colors.primary,
  },
  saveAddressBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  saveAddressGrad: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAddressTxt: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
  },

  // Vacation Manager
  infoCard: {
    backgroundColor: '#EDE9FE',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  infoText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: '#5B21B6',
    lineHeight: 20,
  },
  vacationBanner: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  vacationBannerTxt: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: '#FFFFFF',
  },
  subFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.lg,
  },
  formSectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  historyListTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyCardPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
  },
  vacationItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vacationItemReason: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  vacationItemDates: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  vacationItemDays: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cancelVacBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.danger,
    marginTop: 4,
  },
  cancelVacBtnTxt: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.danger,
  },

  // Refer Card
  referCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  referTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 8,
  },
  referSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  promoCodeContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
    borderRadius: Radius.md,
    padding: Spacing.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  promoCodeLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  promoCodeVal: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: Typography.fontSize.xl,
    color: Colors.primary,
    marginVertical: 8,
    letterSpacing: 2,
  },
  copyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
    ...Shadows.subtle,
  },
  copyBtnTxt: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textOnPrimary,
  },
  stepsContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  stepsTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  stepItem: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginVertical: 4,
  },

  // FAQ/Help Support
  faqHeader: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginVertical: Spacing.md,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  faqQuestion: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  faqAnswer: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  supportContactCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  supportLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
  },
  supportVal: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  supportSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 8,
  },
  chatSupportBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: Radius.full,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    ...Shadows.subtle,
  },
  chatSupportTxt: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: '#FFFFFF',
  },

  // Terms Paragraphs
  termsTitleHeader: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  termsParagraph: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
