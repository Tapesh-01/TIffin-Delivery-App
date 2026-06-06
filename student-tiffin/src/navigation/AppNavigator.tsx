import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDiagnostics, wrapWithDiagnostics } from '../lib/diagnostics';
import { Colors } from '../constants/colors';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { AppConfig } from '../constants/appConfig';

import { registerForPushNotificationsAsync } from '../lib/notifications';
import { CustomAlertProvider, showAlert } from '../components/CustomAlert';

// Screens
import { LoginScreen } from '../components/screens/LoginScreen';
import { HomeScreen } from '../components/screens/HomeScreen';
import { WeeklyMenuScreen } from '../components/screens/WeeklyMenuScreen';
import { SubscriptionScreen } from '../components/screens/SubscriptionScreen';
import { OrderTrackingScreen } from '../components/screens/OrderTrackingScreen';
import { WalletScreen } from '../components/screens/WalletScreen';
import { ProfileScreen } from '../components/screens/ProfileScreen';
import { VacationModeScreen } from '../components/screens/VacationModeScreen';
import { CommunityFeedScreen } from '../components/screens/CommunityFeedScreen';
import { RestaurantsScreen } from '../components/screens/RestaurantsScreen';
import { NameSetupScreen } from '../components/screens/NameSetupScreen';

export type Screen =
  | 'login'
  | 'home'
  | 'menu'
  | 'subscription'
  | 'tracking'
  | 'wallet'
  | 'profile'
  | 'vacation'
  | 'feed'
  | 'restaurants'
  | 'name_setup';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan: 'basic' | 'standard' | 'premium' | 'none';
  walletBalance: number;
  streak?: number;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gender?: string;
  latitude?: number;
  longitude?: number;
  referredBy?: string | null;
}

const AppNavigatorComponent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [user, setUser] = useState<User | null>(null);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeRestaurant, setActiveRestaurant] = useState<any>(null);

  const [checkoutStep, setCheckoutStep] = useState<'idle' | 'address' | 'payment' | 'scanning' | 'confirming' | 'success'>('idle');
  const [history, setHistory] = useState<Screen[]>(['login']);

  // Load persisted cart on mount
  useEffect(() => {
    const loadCartData = async () => {
      try {
        const savedCart = await AsyncStorage.getItem('@tiffin_cart');
        const savedRes = await AsyncStorage.getItem('@tiffin_active_res');
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
        if (savedRes) {
          setActiveRestaurant(JSON.parse(savedRes));
        }
      } catch (e) {
        console.error('Error loading cart data from storage:', e);
      }
    };
    loadCartData();
  }, []);

  // Save cart whenever it changes
  useEffect(() => {
    const saveCartData = async () => {
      try {
        await AsyncStorage.setItem('@tiffin_cart', JSON.stringify(cart));
        if (activeRestaurant) {
          await AsyncStorage.setItem('@tiffin_active_res', JSON.stringify(activeRestaurant));
        } else {
          await AsyncStorage.removeItem('@tiffin_active_res');
        }
      } catch (e) {
        console.error('Error saving cart data to storage:', e);
      }
    };
    saveCartData();
  }, [cart, activeRestaurant]);

  const navigate = (screen: Screen) => {
    if (screen === 'home') {
      setHistory(['home']);
    } else if (screen === 'login') {
      setHistory(['login']);
    } else {
      setHistory(prev => {
        if (prev[prev.length - 1] === screen) return prev;
        return [...prev, screen];
      });
    }
    setCurrentScreen(screen);
  };

  // Sync screen changes to browser URL bar (Expo Web preview helper)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      let routePath = '/';
      if (currentScreen === 'subscription') routePath = '/subscribe';
      else if (currentScreen === 'home') routePath = '/home';
      else if (currentScreen === 'menu') routePath = '/weekly-menu';
      else if (currentScreen === 'profile') routePath = '/profile';
      else if (currentScreen === 'wallet') routePath = '/wallet';
      else if (currentScreen === 'feed') routePath = '/hostel-feed';
      else if (currentScreen === 'restaurants') routePath = '/products';
      else if (currentScreen === 'tracking') routePath = '/track-order';
      else if (currentScreen === 'login') routePath = '/login';
      else if (currentScreen === 'vacation') routePath = '/vacation-mode';
      else if (currentScreen === 'name_setup') routePath = '/setup-profile';
      else routePath = `/${currentScreen}`;
      
      window.history.pushState(null, '', routePath);
    }
  }, [currentScreen]);

  // Check auth status on mount
  useEffect(() => {
    initDiagnostics();
    checkAuthStatus();
  }, []);

  // Hardware back button stack navigation handler (Android gesture)
  useEffect(() => {
    const handleBackPress = () => {
      // Exit app if on login or home, and history is cleared
      if (currentScreen === 'login' || currentScreen === 'home' || history.length <= 1) {
        return false; // default behavior (exits app)
      }

      // Pop from custom navigation history stack
      setHistory(prev => {
        const next = [...prev];
        next.pop(); // remove current screen
        const prevScreen = next[next.length - 1] || 'home';
        setCurrentScreen(prevScreen);
        return next;
      });
      return true; // prevent default behavior (stay in app)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [currentScreen, history]);

  // Override standard React Native Alert.alert globally with our custom alert UI
  useEffect(() => {
    Alert.alert = (title, message, buttons) => {
      const customButtons = buttons?.map(btn => ({
        text: btn.text || 'OK',
        style: btn.style === 'cancel' ? 'cancel' as const : (btn.style === 'destructive' ? 'destructive' as const : 'default' as const),
        onPress: btn.onPress
      })) || [];

      showAlert(title, message || '', customButtons);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('@tiffin_token');
      if (token) {
        const { data } = await api.get('/auth/profile');
        if (data.success) {
          setUser(data.user);
          fetchUserTransactions(data.user.id);
          setupSocket(data.user.id);
          
          const profileCompleted = await AsyncStorage.getItem('@tiffin_profile_completed');
          const needsProfileSetup = 
            profileCompleted !== 'true' && (
              data.user.name === 'New Student' || 
              !data.user.addressLine || 
              !data.user.city || 
              !data.user.gender
            );

          if (needsProfileSetup) {
            setCurrentScreen('name_setup');
          } else {
            setCurrentScreen('home');
          }
          syncPushToken();
        }
      }
    } catch (e) {
      console.log('No valid session found');
      await AsyncStorage.removeItem('@tiffin_token');
    } finally {
      setIsLoading(false);
    }
  };

  const syncPushToken = async () => {
    try {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        await api.put('/auth/profile', { pushToken });
        console.log('✅ Push token synchronized with backend database');
      }
    } catch (err) {
      console.log('Push token sync skipped/failed:', err);
    }
  };

  const setupSocket = (userId: string) => {
    socket.connect();
    socket.emit('join', { userId, role: 'student' });
    
    // Listen for balance updates, etc.
    socket.on('wallet_updated', (newBalance: number) => {
      setUser(prev => prev ? { ...prev, walletBalance: newBalance } : null);
      fetchUserTransactions(userId);
    });
  };

  const fetchUserTransactions = async (userId: string) => {
    try {
      const { data } = await api.get('/wallet/transactions');
      if (data.success) {
        setUserTransactions(data.data);
      }
    } catch (e) {
      console.error('Error fetching transactions:', e);
    }
  };

  const handleLogin = async (userData: any, token: string, isNewUser?: boolean) => {
    await AsyncStorage.setItem('@tiffin_token', token);
    setUser(userData);
    fetchUserTransactions(userData.id);
    setupSocket(userData.id);

    const profileCompleted = await AsyncStorage.getItem('@tiffin_profile_completed');
    const needsProfileSetup = 
      profileCompleted !== 'true' && (
        isNewUser || 
        userData.name === 'New Student' || 
        !userData.addressLine || 
        !userData.city || 
        !userData.gender
      );

    if (needsProfileSetup) {
      navigate('name_setup');
    } else {
      navigate('home');
    }
    syncPushToken();
  };

  const handleNameSetupComplete = async (updatedUser: User) => {
    await AsyncStorage.setItem('@tiffin_profile_completed', 'true');
    setUser(updatedUser);
    navigate('home');
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('@tiffin_token');
    await AsyncStorage.removeItem('@tiffin_profile_completed');
    socket.disconnect();
    setUser(null);
    navigate('login');
  };

  const handleRecharge = async (amount: number, utr: string) => {
    if (!user) return;
    try {
      const { data } = await api.post('/wallet/recharge', { amount, utrCode: utr });
      if (data.success) {
        setUser({ ...user, walletBalance: data.walletBalance });
        fetchUserTransactions(user.id);
        Alert.alert(
          'Recharge Requested!',
          `₹${amount} will be credited to your wallet once the admin verifies the UTR code: ${utr}.`
        );
      }
    } catch (e: any) {
      Alert.alert('Recharge Failed', e.response?.data?.message || e.message);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) return;
    const plan = AppConfig.plans.find((p) => p.id === planId);
    const requiredBalance = plan ? plan.pricePerDay : 0;

    if (user.walletBalance < requiredBalance) {
      Alert.alert(
        'Insufficient Balance',
        `Your wallet balance is insufficient (Current Balance: ₹${user.walletBalance}, Required: ₹${requiredBalance}). Please recharge your wallet to subscribe.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Recharge Now 💰', onPress: () => navigate('wallet') }
        ]
      );
      return;
    }

    try {
      const { data } = await api.put('/auth/profile', { plan: planId });
      if (data.success) {
        setUser(data.user);
        fetchUserTransactions(user.id);
        Alert.alert(
          'Subscribed successfully!',
          `You have successfully subscribed to the ${planId.toUpperCase()} plan. Your daily tiffin order for today has been created and sent to the kitchen.`
        );
        navigate('home');
      }
    } catch (e: any) {
      console.error('Subscription error:', e);
      Alert.alert('Subscription Failed', e.response?.data?.message || e.message || 'Something went wrong.');
    }
  };

  if (isLoading) {
    return (
      <CustomAlertProvider>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </CustomAlertProvider>
    );
  }

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/profile');
      if (data.success) {
        setUser(data.user);
        fetchUserTransactions(data.user.id);
      }
    } catch (e) {
      console.log('Error refreshing user profile:', e);
    }
  };

  const renderContent = () => {
    if (currentScreen === 'login' || !user) {
      return <LoginScreen onLogin={handleLogin} />;
    }

    switch (currentScreen) {
      case 'home':
        return <HomeScreen user={user} navigate={navigate} refreshUser={refreshUser} />;
      case 'menu':
        return <WeeklyMenuScreen navigate={navigate} />;
      case 'subscription':
        return <SubscriptionScreen currentPlan={user.plan} navigate={navigate} onSubscribe={handleSubscribe} />;
      case 'tracking':
        return <OrderTrackingScreen navigate={navigate} userName={user.name} />;
      case 'wallet':
        return <WalletScreen user={user} navigate={navigate} onRecharge={handleRecharge} transactions={userTransactions} refreshUser={refreshUser} />;
      case 'profile':
        return (
          <ProfileScreen
            user={user}
            navigate={navigate}
            onLogout={handleLogout}
            cart={cart}
            setCart={setCart}
            activeRestaurant={activeRestaurant}
            checkoutStep={checkoutStep}
            setCheckoutStep={setCheckoutStep}
            refreshUser={refreshUser}
          />
        );
      case 'vacation':
        return <VacationModeScreen navigate={navigate} user={user} />;
      case 'feed':
        return <CommunityFeedScreen navigate={navigate} userName={user.name} />;
      case 'restaurants':
        return (
          <RestaurantsScreen
            navigate={navigate}
            user={user}
            setUser={setUser}
            cart={cart}
            setCart={setCart}
            activeRestaurant={activeRestaurant}
            setActiveRestaurant={setActiveRestaurant}
            checkoutStep={checkoutStep}
            setCheckoutStep={setCheckoutStep}
          />
        );
      case 'name_setup':
        return <NameSetupScreen user={user} onComplete={handleNameSetupComplete} />;
      default:
        return <HomeScreen user={user} navigate={navigate} refreshUser={refreshUser} />;
    }
  };

  return (
    <CustomAlertProvider>
      {renderContent()}
    </CustomAlertProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

export const AppNavigator = wrapWithDiagnostics(AppNavigatorComponent);
