import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { Screen, User } from '../../navigation/AppNavigator';
import { BottomBar } from './SubscriptionScreen';
import { api } from '../../lib/api';
import { CustomerMap } from '../CustomerMap';
import { socket } from '../../lib/socket';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  icon?: string;
  image?: string;
  isVeg?: boolean;
  avgRating?: number;
  ratingCount?: number;
  isAvailable?: boolean;
  category?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  rating: number;
  ratingCount: number;
  deliveryTime: string;
  deliveryFee: number;
  imageUrl: string;
  menu: MenuItem[];
}

const { width } = Dimensions.get('window');

const HOSTEL_COORDS: Record<string, { lat: number; lng: number }> = {
  'Boys Hostel 3':  { lat: 28.6200, lng: 77.2100 },
  'Boys Hostel 2':  { lat: 28.6210, lng: 77.2120 },
  'Girls Hostel 1': { lat: 28.6180, lng: 77.2060 },
  'Girls Hostel 2': { lat: 28.6190, lng: 77.2080 },
};

const campusHostels = ['Boys Hostel 3', 'Boys Hostel 2', 'Girls Hostel 1', 'Girls Hostel 2'];

const ADDON_PRICES: Record<string, number> = {
  'Extra Roti': 15,
  'Curd Cup': 20,
  'Gulab Jamun': 25,
  'Salad Bowl': 15,
};

const campusAddons = ['Extra Roti', 'Curd Cup', 'Gulab Jamun', 'Salad Bowl'];

interface RestaurantsScreenProps {
  navigate: (screen: Screen) => void;
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  cart: Record<string, number>;
  setCart: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  activeRestaurant: Restaurant | null;
  setActiveRestaurant: React.Dispatch<React.SetStateAction<Restaurant | null>>;
  checkoutStep: 'idle' | 'address' | 'payment' | 'scanning' | 'confirming';
  setCheckoutStep: React.Dispatch<React.SetStateAction<'idle' | 'address' | 'payment' | 'scanning' | 'confirming'>>;
}

export const RestaurantsScreen: React.FC<RestaurantsScreenProps> = ({
  navigate,
  user,
  setUser,
  cart,
  setCart,
  activeRestaurant,
  setActiveRestaurant,
  checkoutStep,
  setCheckoutStep,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [viewingRestaurant, setViewingRestaurant] = useState<Restaurant | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [showVegEffect, setShowVegEffect] = useState(false);
  const vegAnim = useRef(new Animated.Value(0)).current;
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuPriceFilter, setMenuPriceFilter] = useState<'all' | 'under50' | 'under100' | 'under150' | 'above150'>('all');
  const [showMenuFilter, setShowMenuFilter] = useState(false);

  const triggerVegEffect = () => {
    setShowVegEffect(true);
    vegAnim.setValue(0);
    Animated.timing(vegAnim, {
      toValue: 1,
      duration: 2300,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => setShowVegEffect(false));
  };

  useEffect(() => {
    if (activeRestaurant && Object.keys(cart).length > 0) {
      setViewingRestaurant(activeRestaurant);
    }
  }, [activeRestaurant]);

  useEffect(() => {
    socket.on('restaurant_menu_updated', ({ restaurantId, itemId, isAvailable, action, item }) => {
      const updateMenuArray = (menu: MenuItem[]) => {
        if (action === 'add' && item) {
          const newItem: MenuItem = {
            id: item._id || item.id,
            name: item.name,
            price: item.price,
            description: item.description || '',
            icon: item.isVeg ? '🟢 Veg' : '🔴 Non-Veg',
            image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
            isVeg: item.isVeg,
            avgRating: item.avgRating || 0,
            ratingCount: item.ratingCount || 0,
            isAvailable: item.isAvailable !== false,
            originalPrice: item.originalPrice
          };
          if (menu.some(m => m.id === newItem.id)) {
            return menu.map(m => m.id === newItem.id ? newItem : m);
          }
          return [...menu, newItem];
        }

        if (action === 'update' && item) {
          return menu.map(m => {
            if (m.id === (item._id || item.id)) {
              return {
                ...m,
                name: item.name,
                price: item.price,
                description: item.description || '',
                icon: item.isVeg ? '🟢 Veg' : '🔴 Non-Veg',
                image: item.image || m.image,
                isVeg: item.isVeg,
                isAvailable: item.isAvailable !== false,
                originalPrice: item.originalPrice
              };
            }
            return m;
          });
        }

        if (action === 'delete') {
          return menu.filter(m => m.id !== itemId);
        }

        return menu.map(m => {
          if (m.id === itemId) {
            return { ...m, isAvailable };
          }
          return m;
        });
      };

      setRestaurants(prev => prev.map(r => {
        if (r.id === restaurantId) {
          return {
            ...r,
            menu: updateMenuArray(r.menu)
          };
        }
        return r;
      }));

      setViewingRestaurant(prev => {
        if (prev && prev.id === restaurantId) {
          return {
            ...prev,
            menu: updateMenuArray(prev.menu)
          };
        }
        return prev;
      });

      setCustomizingItem(prev => {
        if (prev && prev.id === itemId) {
          if (action === 'delete') {
            return null;
          }
          if (action === 'update' && item) {
            return {
              ...prev,
              name: item.name,
              price: item.price,
              description: item.description || '',
              isVeg: item.isVeg,
              isAvailable: item.isAvailable !== false,
              originalPrice: item.originalPrice
            };
          }
          return { ...prev, isAvailable };
        }
        return prev;
      });

      setSelectedMenuItem(prev => {
        if (prev && prev.id === itemId) {
          if (action === 'delete') {
            return null;
          }
          if (action === 'update' && item) {
            return {
              ...prev,
              name: item.name,
              price: item.price,
              description: item.description || '',
              isVeg: item.isVeg,
              isAvailable: item.isAvailable !== false,
              originalPrice: item.originalPrice
            };
          }
          return { ...prev, isAvailable };
        }
        return prev;
      });

      if (action === 'delete' || isAvailable === false || (action === 'update' && item && item.isAvailable === false)) {
        setCart(prev => {
          if (prev[itemId]) {
            const next = { ...prev };
            delete next[itemId];
            return next;
          }
          return prev;
        });
      }
    });

    return () => {
      socket.off('restaurant_menu_updated');
    };
  }, []);

  const [activeReviewItem, setActiveReviewItem] = useState<MenuItem | null>(null);
  const [productRating, setProductRating] = useState(5);
  const [productComment, setProductComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      if (viewingRestaurant) {
        const slug = viewingRestaurant.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
        window.history.pushState(null, '', `/products/${slug}`);
      } else {
        window.history.pushState(null, '', `/products`);
      }
    }
  }, [viewingRestaurant]);

  const handleOpenProductReviewModal = (item: MenuItem) => {
    setActiveReviewItem(item);
    setProductRating(5);
    setProductComment('');
  };

  const handleSubmittingProductReview = async () => {
    if (!activeReviewItem || !viewingRestaurant) return;
    setReviewLoading(true);
    try {
      const { data } = await api.post(`/restaurants/${viewingRestaurant.id}/items/${activeReviewItem.id}/review`, {
        rating: productRating,
        comment: productComment,
      });

      if (data.success) {
        Alert.alert('🌟 Thank You!', 'Aapka review submit ho gaya hai.');
        
        const updatedMenu = viewingRestaurant.menu.map(m => {
          if (m.id === activeReviewItem.id) {
            const currentCount = m.ratingCount || 0;
            const currentAvg = m.avgRating || 0;
            const newCount = currentCount + 1;
            const newAvg = parseFloat(((currentAvg * currentCount + productRating) / newCount).toFixed(1));
            return { ...m, avgRating: newAvg, ratingCount: newCount };
          }
          return m;
        });
        
        const updatedRes = { ...viewingRestaurant, menu: updatedMenu };
        setViewingRestaurant(updatedRes);
        if (activeRestaurant && activeRestaurant.id === viewingRestaurant.id) {
          setActiveRestaurant(updatedRes);
        }
        
        fetchRestaurants();
        closeReviewOverlay();
      }
    } catch (e: any) {
      console.error('Failed to submit product review', e);
      Alert.alert('Error', e.response?.data?.message || 'Review submit nahi ho paya.');
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const { data } = await api.get('/restaurants');
      if (data.success && Array.isArray(data.data)) {
        const mappedRestaurants = data.data.map((res: any) => ({
          id: res._id || res.id,
          name: res.name,
          description: res.description || `${res.cuisine} Specialities`,
          cuisine: res.cuisine,
          rating: res.rating || 4.5,
          ratingCount: res.ratingCount || 100,
          deliveryTime: res.deliveryTime || '25-35 mins',
          deliveryFee: res.deliveryFee !== undefined ? res.deliveryFee : 20,
          imageUrl: res.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60',
          menu: (res.menuItems || []).map((m: any) => ({
            id: m._id || m.id,
            name: m.name,
            price: m.price,
            description: m.description || '',
            icon: m.isVeg ? '🟢 Veg' : '🔴 Non-Veg',
            image: m.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
            isVeg: m.isVeg,
            avgRating: m.avgRating || 0,
            ratingCount: m.ratingCount || 0,
            isAvailable: m.isAvailable !== false,
            category: m.category || 'Popular Dishes',
            originalPrice: m.originalPrice
          })),
        }));
        setRestaurants(mappedRestaurants);
      }
    } catch (e) {
      console.error('Failed to fetch restaurants', e);
    } finally {
      setLoading(false);
    }
  };
  
  const [paymentMode, setPaymentMode] = useState<'COD' | 'Online' | 'Wallet'>('COD');
  const [utrCode, setUtrCode] = useState('');

  // Address Details Form States
  const [addressHostel, setAddressHostel] = useState(user.addressLine || '');
  const [addressRoom, setAddressRoom] = useState(user.city || '');
  const [deliveryPhone, setDeliveryPhone] = useState(user.phone || '');
  const [customerName, setCustomerName] = useState(user.name === 'New Student' ? '' : (user.name || ''));
  const [referralCode, setReferralCode] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(
    user.latitude && user.longitude ? { lat: user.latitude, lng: user.longitude } : null
  );
  const [fetchingGps, setFetchingGps] = useState(false);

  const fetchPlaceName = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { 'User-Agent': 'MyTiffinApp/1.0' }
      });
      const data = await response.json();
      const placeName = data.name || data.address?.amenity || data.address?.building || data.address?.road || data.address?.suburb || `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
      return placeName;
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      return `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
    }
  };

  const handleDetectLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setFetchingGps(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setDeliveryCoords(coords);
          const placeName = await fetchPlaceName(coords.lat, coords.lng);
          setAddressHostel(placeName);
          setFetchingGps(false);
          Alert.alert('📍 Location Found!', `Latitude: ${coords.lat.toFixed(5)}, Longitude: ${coords.lng.toFixed(5)}`);
        },
        (error) => {
          setFetchingGps(false);
          console.error('Error getting location: ', error);
          Alert.alert('GPS Error', 'Aapka live location check nahi kiya ja saka. Kripya permissions check karein ya manually enter karein.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      Alert.alert('Not Supported', 'Geolocation is not supported by your device/browser.');
    }
  };

  useEffect(() => {
    if (checkoutStep === 'address' && !deliveryCoords) {
      handleDetectLocation();
    }
  }, [checkoutStep]);

  // Dynamic Item Detail States
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [itemReviews, setItemReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [tempQty, setTempQty] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [orderAddons, setOrderAddons] = useState<string[]>([]);

  // Animation values for Popups
  const [detailSlideAnim] = useState(new Animated.Value(800));
  const [detailBackdropOpacity] = useState(new Animated.Value(0));
  const prevSelectedMenuItemRef = useRef<MenuItem | null>(null);
  const detailScrollRef = useRef<ScrollView>(null);

  const [customSlideAnim] = useState(new Animated.Value(800));
  const [customBackdropOpacity] = useState(new Animated.Value(0));

  const [reviewSlideAnim] = useState(new Animated.Value(800));
  const [reviewBackdropOpacity] = useState(new Animated.Value(0));

  // Trigger animations when Selected Menu Item changes
  useEffect(() => {
    if (selectedMenuItem) {
      if (prevSelectedMenuItemRef.current === null) {
        detailSlideAnim.setValue(800);
        detailBackdropOpacity.setValue(0);
        Animated.parallel([
          Animated.timing(detailBackdropOpacity, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(detailSlideAnim, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Reset scroll position to top instantly so new item starts from top
        detailScrollRef.current?.scrollTo({ y: 0, animated: false });

        // Slide up the new item smoothly, keeping backdrop fully visible
        detailSlideAnim.setValue(800);
        Animated.timing(detailSlideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
        detailBackdropOpacity.setValue(1);
      }
    }
    prevSelectedMenuItemRef.current = selectedMenuItem;
  }, [selectedMenuItem]);

  // Trigger animations when Customizing Item changes
  useEffect(() => {
    if (customizingItem) {
      customSlideAnim.setValue(800);
      customBackdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(customBackdropOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(customSlideAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [customizingItem]);

  // Trigger animations when Active Review Item changes
  useEffect(() => {
    if (activeReviewItem) {
      reviewSlideAnim.setValue(800);
      reviewBackdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(reviewBackdropOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(reviewSlideAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [activeReviewItem]);

  // Closer functions for Popups
  const closeDetailOverlay = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(detailBackdropOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(detailSlideAnim, {
        toValue: 800,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedMenuItem(null);
      if (callback) callback();
    });
  };

  const closeCustomizingOverlay = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(customBackdropOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(customSlideAnim, {
        toValue: 800,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCustomizingItem(null);
      if (callback) callback();
    });
  };

  const closeReviewOverlay = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(reviewBackdropOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(reviewSlideAnim, {
        toValue: 800,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveReviewItem(null);
      if (callback) callback();
    });
  };

  // Sync temp quantity and selected addons whenever selectedMenuItem changes
  useEffect(() => {
    if (selectedMenuItem) {
      const currentQty = cart[selectedMenuItem.id] || 1;
      setTempQty(currentQty);
      setSelectedAddons([]); // reset addons for this item
    }
  }, [selectedMenuItem, cart]);

  // Sync temp quantity and selected addons whenever customizingItem changes
  useEffect(() => {
    if (customizingItem) {
      const currentQty = cart[customizingItem.id] || 1;
      setTempQty(currentQty);
      setSelectedAddons([]); // reset addons for this item
    }
  }, [customizingItem, cart]);

  const handleCustomAddToCart = () => {
    if (!customizingItem) return;
    setCart(prev => ({ ...prev, [customizingItem.id]: tempQty }));
    setOrderAddons(prev => {
      const merged = [...prev, ...selectedAddons];
      return Array.from(new Set(merged));
    });
    closeCustomizingOverlay(() => {
      Alert.alert('🛒 Item Added', `${customizingItem.name} added to cart!`);
    });
  };

  const handleAddToCart = () => {
    if (!selectedMenuItem) return;
    setCart(prev => ({ ...prev, [selectedMenuItem.id]: tempQty }));
    setOrderAddons(prev => {
      const merged = [...prev, ...selectedAddons];
      return Array.from(new Set(merged));
    });
    closeDetailOverlay(() => {
      Alert.alert('🛒 Item Added', `${selectedMenuItem.name} added to cart!`);
    });
  };

  const handleBuyNow = () => {
    if (!selectedMenuItem) return;
    setCart(prev => ({ ...prev, [selectedMenuItem.id]: tempQty }));
    setOrderAddons(prev => {
      const merged = [...prev, ...selectedAddons];
      return Array.from(new Set(merged));
    });
    closeDetailOverlay(() => {
      setCheckoutStep('address');
    });
  };

  // Fetch reviews for selected menu item
  useEffect(() => {
    if (selectedMenuItem && viewingRestaurant) {
      const fetchItemReviews = async () => {
        setLoadingReviews(true);
        try {
          const { data } = await api.get(`/restaurants/${viewingRestaurant.id}/items/${selectedMenuItem.id}/reviews`);
          if (data.success) {
            setItemReviews(data.data || []);
          }
        } catch (e) {
          console.error('Failed to fetch item reviews:', e);
        } finally {
          setLoadingReviews(false);
        }
      };
      fetchItemReviews();
    }
  }, [selectedMenuItem, viewingRestaurant]);

  // Sync active views & checkout stages to browser URL path
  useEffect(() => {
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      if (checkoutStep === 'address') {
        window.history.pushState(null, '', `/checkout/address`);
      } else if (checkoutStep === 'payment') {
        window.history.pushState(null, '', `/checkout/payment`);
      } else if (viewingRestaurant) {
        const resSlug = viewingRestaurant.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
        if (selectedMenuItem) {
          const itemSlug = selectedMenuItem.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
          window.history.pushState(null, '', `/products/${resSlug}/${itemSlug}`);
        } else {
          window.history.pushState(null, '', `/products/${resSlug}`);
        }
      } else {
        window.history.pushState(null, '', `/products`);
      }
    }
  }, [viewingRestaurant, selectedMenuItem, checkoutStep]);

  // Merchant details matching Wallet Screen exactly
  const upiId = 'tapeshkarkel@okaxis';
  const merchantName = 'My Tiffin';

  // Cuisine categories
  const cuisines = ['All', 'American', 'Japanese', 'Italian', 'Indian', 'Mexican', 'Healthy'];

  // Filter restaurants
  const filteredRestaurants = restaurants.filter((r) => {
    const matchesCuisine = selectedCuisine === 'All' || r.cuisine === selectedCuisine;
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVeg = !isVegOnly || (r.menu && r.menu.some(item => item.isVeg));
    return matchesCuisine && matchesSearch && matchesVeg;
  });

  const handleOpenMenu = (res: Restaurant) => {
    if (activeRestaurant && activeRestaurant.id !== res.id && Object.keys(cart).length > 0) {
      Alert.alert(
        'Replace Cart?',
        'Aapke cart me dusre restaurant ke items hain. Kya aap cart clear karke is restaurant ka menu dekhna chahte hain?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear & Open',
            style: 'destructive',
            onPress: () => {
              setCart({});
              setActiveRestaurant(res);
              setViewingRestaurant(res);
            }
          }
        ]
      );
      return;
    }
    setActiveRestaurant(res);
    setViewingRestaurant(res);
  };

  const handleCloseMenu = () => {
    setViewingRestaurant(null);
    setSelectedMenuItem(null);
    setActiveCategory('All');
    setMenuSearchQuery('');
    setMenuPriceFilter('all');
    setShowMenuFilter(false);
  };

  const updateCartQty = (itemId: string, diff: number) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + diff);
      return { ...prev, [itemId]: next };
    });
  };

  // Calculations
  const cartTotalQty = Object.values(cart).reduce((sum, q) => sum + q, 0);
  
  const getCartTotalAmount = () => {
    if (!activeRestaurant) return 0;
    return Object.entries(cart).reduce((sum, [itemId, qty]) => {
      const item = activeRestaurant.menu.find((m) => m.id === itemId);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  };

  const totalAmount = getCartTotalAmount();
  const addonsTotalAmount = orderAddons.reduce((sum, name) => sum + (ADDON_PRICES[name] || 0), 0);
  const grandTotal = totalAmount + (activeRestaurant?.deliveryFee || 0) + addonsTotalAmount;

  // Submit Order
  const handlePlaceOrder = async () => {
    if (!activeRestaurant || cartTotalQty === 0) return;

    if (paymentMode === 'Online') {
      setCheckoutStep('scanning');
      return;
    }

    if (paymentMode === 'Wallet') {
      if (user.walletBalance < grandTotal) {
        Alert.alert('Insufficient Balance', 'Wallet me balance kam hai. Kripya dusra payment method select karein.');
        return;
      }
      await completeOrderInsertion('Wallet');
      return;
    }

    // COD Flow
    await completeOrderInsertion('COD');
  };

  const completeOrderInsertion = async (mode: 'COD' | 'Online' | 'Wallet') => {
    if (!activeRestaurant) return;

    const orderedItems = Object.entries(cart)
      .map(([itemId, qty]) => {
        const item = activeRestaurant.menu.find((m) => m.id === itemId);
        if (!item) return null;
        return {
          id: item.id,
          name: item.name,
          quantity: qty,
          price: item.price
        };
      }).filter(Boolean);

    try {
      setCheckoutStep('confirming');

      // Place order with backend API (profile has already been updated in the previous step)
      const { data } = await api.post('/orders/place', {
        restaurantId: activeRestaurant.id,
        items: orderedItems,
        totalAmount: grandTotal,
        paymentMethod: mode === 'Online' ? 'UPI' : (mode === 'Wallet' ? 'Wallet' : 'COD'),
        utrCode: mode === 'Online' ? utrCode.trim() : undefined,
        addons: orderAddons, // Include add-ons array
        latitude: deliveryCoords?.lat || null,
        longitude: deliveryCoords?.lng || null
      });

      if (data.success) {
        Alert.alert(
          'Order Placed!',
          mode === 'Online'
            ? `Your payment of ₹${grandTotal} with UTR: ${utrCode} has been submitted for admin approval. Your order is cooking!`
            : (mode === 'Wallet'
              ? `₹${grandTotal} has been debited from your wallet. Your order is cooking!`
              : `Your order is placed! Please keep ₹${grandTotal} ready in cash for delivery.`)
        );

        setCart({});
        setActiveRestaurant(null);
        handleCloseMenu();
        setCheckoutStep('idle');
        setUtrCode('');
        setOrderAddons([]); // Clear addons
        navigate('tracking');
      }
    } catch (e: any) {
      console.error('Order checkout error:', e);
      Alert.alert('Checkout Failed', e.response?.data?.message || e.message || 'Something went wrong.');
      setCheckoutStep('payment'); // Go back to payment step to retry
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍔 Restaurants</Text>
        <Text style={styles.headerSub}>Find local favorites delivered instantly</Text>

        {/* Search Input Row with Veg Toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <View style={[styles.searchContainer, { marginTop: 0, flex: 1 }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search burgers, paneer, healthy, etc..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Veg Only Toggle */}
          <TouchableOpacity 
            onPress={() => {
              const nextVal = !isVegOnly;
              setIsVegOnly(nextVal);
              if (nextVal) {
                triggerVegEffect();
              }
            }}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isVegOnly ? '#E8F8EF' : '#F8FAFC',
              borderWidth: 1.5,
              borderColor: isVegOnly ? '#10B981' : '#E2E8F0',
              borderRadius: Radius.lg || 12,
              paddingHorizontal: 12,
              height: 46,
              gap: 6,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isVegOnly ? 0.05 : 0.02,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            {/* Standard Veg Border-Dot Symbol */}
            <View style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              borderWidth: 1.5,
              borderColor: isVegOnly ? '#10B981' : '#94A3B8',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 2
            }}>
              <View style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: isVegOnly ? '#10B981' : '#94A3B8'
              }} />
            </View>
            <Text style={{
              fontFamily: Typography.fontFamily.semiBold,
              fontSize: Typography.fontSize.xs,
              color: isVegOnly ? '#065F46' : '#475569',
            }}>
              Veg Only
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cuisine selector */}
      <View style={{ height: 50, marginVertical: Spacing.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cuisineScroll}>
          {cuisines.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.cuisineChip,
                selectedCuisine === c && styles.cuisineChipActive,
              ]}
              onPress={() => setSelectedCuisine(c)}
            >
              <Text
                style={[
                  styles.cuisineChipText,
                  selectedCuisine === c && styles.cuisineChipTextActive,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Restaurant List */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredRestaurants.length > 0 ? (
          filteredRestaurants.map((res) => (
            <TouchableOpacity
              key={res.id}
              style={[styles.resCard, Shadows.card]}
              onPress={() => handleOpenMenu(res)}
              activeOpacity={0.95}
            >
              <Image source={{ uri: res.imageUrl }} style={styles.resImg} />
              <View style={styles.cuisineTag}>
                <Text style={styles.cuisineTagText}>{res.cuisine}</Text>
              </View>
              <View style={styles.resCardInfo}>
                <View style={styles.resRow}>
                  <Text style={styles.resName}>{res.name}</Text>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.starIcon}>⭐</Text>
                    <Text style={styles.ratingText}>{res.rating}</Text>
                  </View>
                </View>
                <Text style={styles.resDesc} numberOfLines={1}>
                  {res.description}
                </Text>
                <View style={styles.resMeta}>
                  <Text style={styles.metaText}>⏱️ {res.deliveryTime}</Text>
                  <Text style={styles.metaDivider}>•</Text>
                  <Text style={styles.metaText}>🛵 ₹{res.deliveryFee} Delivery</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
            <Text style={styles.emptyTxt}>No restaurants found matching your query.</Text>
          </View>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Reusable Bottom Bar */}
      <BottomBar active="restaurants" navigate={navigate} />

      {/* Restaurant Menu Modal Overlay (Absolutely Positioned to fit inside the mobile frame) */}
      {viewingRestaurant && (
        <View style={styles.modalWrapper}>
          <View style={styles.modalContainer}>
            {/* Modal Header (only in idle menu view) */}
            {checkoutStep === 'idle' && (
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCloseMenu} style={styles.closeBtn}>
                  <Text style={{ fontSize: 24, color: '#1E293B' }}>✕</Text>
                </TouchableOpacity>
                <View style={styles.modalHeaderInfo}>
                  <Text style={styles.modalTitle}>{viewingRestaurant.name}</Text>
                  <Text style={styles.modalSub}>{viewingRestaurant.cuisine} • ⭐ {viewingRestaurant.rating}</Text>
                </View>
              </View>
            )}

            {/* Step 1: Menu List */}
            {checkoutStep === 'idle' && (() => {
              // Apply veg filter
              let menu = (viewingRestaurant.menu || []).filter(m => !isVegOnly || m.isVeg);
              // Apply menu search filter
              if (menuSearchQuery.trim()) {
                const q = menuSearchQuery.toLowerCase().trim();
                menu = menu.filter(m =>
                  m.name.toLowerCase().includes(q) ||
                  (m.description || '').toLowerCase().includes(q)
                );
              }
              // Apply price filter
              if (menuPriceFilter === 'under50') menu = menu.filter(m => m.price < 50);
              else if (menuPriceFilter === 'under100') menu = menu.filter(m => m.price < 100);
              else if (menuPriceFilter === 'under150') menu = menu.filter(m => m.price < 150);
              else if (menuPriceFilter === 'above150') menu = menu.filter(m => m.price >= 150);

              const categories = ['All', ...Array.from(new Set(menu.map(m => m.category || 'Popular Dishes')))];
              
              const grouped: Record<string, MenuItem[]> = {};
              menu.forEach(item => {
                const cat = item.category || 'Popular Dishes';
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(item);
              });

              return (
                <View style={{ flex: 1 }}>
                  {/* Category Chips Selection Bar */}
                  <View style={styles.categoryBarContainer}>
                    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryBarScroll}>
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setActiveCategory(cat)}
                          style={[
                            styles.categoryChip,
                            activeCategory === cat && styles.categoryChipActive
                          ]}
                        >
                          <Text style={[
                            styles.categoryChipText,
                            activeCategory === cat && styles.categoryChipTextActive
                          ]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* ── MENU SEARCH BAR + FILTER ICON ── */}
                  <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 }}>
                    {/* Search row — same style as outer search bar */}
                    <View style={styles.menuSearchRow}>
                      <Text style={styles.searchIcon}>🔍</Text>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search items…"
                        placeholderTextColor="#94A3B8"
                        value={menuSearchQuery}
                        onChangeText={setMenuSearchQuery}
                        returnKeyType="search"
                      />
                      {menuSearchQuery.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setMenuSearchQuery('')}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={{ marginRight: 6 }}
                        >
                          <Text style={{ fontSize: 15, color: '#94A3B8', fontWeight: 'bold' }}>✕</Text>
                        </TouchableOpacity>
                      )}
                      {/* Filter funnel button */}
                      <TouchableOpacity
                        onPress={() => setShowMenuFilter(v => !v)}
                        activeOpacity={0.7}
                        style={[
                          styles.filterFunnelBtn,
                          (showMenuFilter || menuPriceFilter !== 'all') && styles.filterFunnelBtnActive,
                        ]}
                      >
                        {/* SVG-style funnel using unicode + text */}
                        <Text style={{ fontSize: 14, lineHeight: 18 }}>⚙️</Text>
                        {menuPriceFilter !== 'all' && (
                          <View style={styles.filterActiveDot} />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Dropdown filter box — appears below the search bar */}
                    {showMenuFilter && (
                      <View style={styles.filterDropdownBox}>
                        <Text style={styles.filterDropdownTitle}>💰 Filter by Price</Text>
                        <View style={styles.filterDropdownGrid}>
                          {(
                            [
                              { key: 'all',      label: 'All Prices',   sub: 'Show everything' },
                              { key: 'under50',  label: 'Under ₹50',    sub: 'Budget friendly' },
                              { key: 'under100', label: 'Under ₹100',   sub: 'Most popular' },
                              { key: 'under150', label: 'Under ₹150',   sub: 'Mid range' },
                              { key: 'above150', label: '₹150 & above', sub: 'Premium dishes' },
                            ] as { key: typeof menuPriceFilter; label: string; sub: string }[]
                          ).map(opt => (
                            <TouchableOpacity
                              key={opt.key}
                              onPress={() => { setMenuPriceFilter(opt.key); setShowMenuFilter(false); }}
                              activeOpacity={0.75}
                              style={[
                                styles.filterOptionCard,
                                menuPriceFilter === opt.key && styles.filterOptionCardActive,
                              ]}
                            >
                              <Text style={[
                                styles.filterOptionLabel,
                                menuPriceFilter === opt.key && styles.filterOptionLabelActive,
                              ]}>
                                {opt.label}
                              </Text>
                              <Text style={[
                                styles.filterOptionSub,
                                menuPriceFilter === opt.key && { color: Colors.primary },
                              ]}>
                                {opt.sub}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* No results state */}
                  {menu.length === 0 && (
                    <View style={{ alignItems: 'center', paddingTop: 48, paddingBottom: 24 }}>
                      <Text style={{ fontSize: 36, marginBottom: 12 }}>🍽️</Text>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 6 }}>No items found</Text>
                      <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>
                        Try adjusting your search or price filter.
                      </Text>
                      <TouchableOpacity
                        onPress={() => { setMenuSearchQuery(''); setMenuPriceFilter('all'); }}
                        style={{ marginTop: 16, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 }}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Clear Filters</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}>
                    {Object.entries(grouped)
                      .filter(([catName]) => activeCategory === 'All' || activeCategory === catName)
                      .map(([categoryName, catItems]) => (
                        <View key={categoryName} style={{ marginBottom: 20 }}>
                          <Text style={styles.menuLabel}>🍳 {categoryName}</Text>
                          
                          {catItems.map((item) => {
                            const qty = cart[item.id] || 0;
                            const isAvailable = item.isAvailable !== false;
                            return (
                              <View key={item.id} style={styles.menuCard}>
                                <TouchableOpacity
                                    onPress={isAvailable ? () => setSelectedMenuItem(item) : undefined}
                                    style={[styles.menuCardLeft, !isAvailable && { opacity: 0.6 }]}
                                    activeOpacity={isAvailable ? 0.7 : 1}
                                  >
                                  {/* Left: Food Image with Veg/Non-Veg Badge */}
                                  <View style={styles.menuItemImageWrapper}>
                                    <Image source={{ uri: item.image }} style={styles.menuItemImage} />
                                    {!isAvailable && (
                                      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold', fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase' }}>Sold Out</Text>
                                      </View>
                                    )}
                                    <View style={[styles.vegBadge, { backgroundColor: item.isVeg ? '#10B981' : '#EF4444' }]}>
                                      <Text style={styles.vegBadgeText}>{item.isVeg ? 'Veg' : 'Non-Veg'}</Text>
                                    </View>
                                  </View>

                                  {/* Middle: Details & Ratings */}
                                  <View style={styles.menuCardDetails}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <Text style={[styles.menuItemName, !isAvailable && { color: '#94A3B8', textDecorationLine: 'line-through' }]}>{item.name}</Text>
                                      {!isAvailable && (
                                        <View style={{ backgroundColor: '#EF4444', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                                          <Text style={{ fontSize: 8, color: '#fff', fontWeight: 'bold' }}>SOLD OUT</Text>
                                        </View>
                                      )}
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                                      <Text style={styles.menuItemPrice}>₹{item.price}</Text>
                                      {item.originalPrice && item.originalPrice > item.price && (
                                        <>
                                          <Text style={{ fontSize: 12, textDecorationLine: 'line-through', color: '#94A3B8' }}>₹{item.originalPrice}</Text>
                                          <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                                            <Text style={{ fontSize: 10, color: '#22C55E', fontWeight: 'bold' }}>
                                              {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                                            </Text>
                                          </View>
                                        </>
                                      )}
                                    </View>
                                    <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                                    
                                    {/* Rating details & Rate Button */}
                                    <View style={styles.productRatingRow}>
                                      {item.avgRating && item.avgRating > 0 ? (
                                        <View style={styles.productRatingBadge}>
                                          <Text style={styles.productRatingText}>⭐ {item.avgRating} ({item.ratingCount})</Text>
                                        </View>
                                      ) : (
                                        <Text style={styles.noRatingText}>No reviews yet</Text>
                                      )}
                                      
                                      <TouchableOpacity
                                        onPress={() => handleOpenProductReviewModal(item)}
                                        style={styles.productRateBtn}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                      >
                                        <Text style={styles.productRateBtnText}>★ Rate</Text>
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                </TouchableOpacity>

                                {/* Right: Quantity controls */}
                                <View style={styles.qtyContainer}>
                                  {!isAvailable ? (
                                    <View style={{ backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 6 }}>
                                      <Text style={{ fontSize: 10, color: '#64748B', fontFamily: Typography.fontFamily.bold }}>SOLD OUT</Text>
                                    </View>
                                  ) : qty > 0 ? (
                                    <View style={styles.qtyControlsRow}>
                                      <TouchableOpacity onPress={() => updateCartQty(item.id, -1)} style={styles.qtyBtn}>
                                        <Text style={styles.qtyBtnText}>-</Text>
                                      </TouchableOpacity>
                                      <Text style={styles.qtyVal}>{qty}</Text>
                                      <TouchableOpacity onPress={() => updateCartQty(item.id, 1)} style={styles.qtyBtn}>
                                        <Text style={styles.qtyBtnText}>+</Text>
                                      </TouchableOpacity>
                                    </View>
                                  ) : (
                                    <TouchableOpacity onPress={() => setCustomizingItem(item)} style={styles.addBtn}>
                                      <Text style={styles.addBtnText}>ADD +</Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ))}
                  </ScrollView>
                </View>
              );
            })()}



            {/* Step 2: Address Form Screen */}
            {checkoutStep === 'address' && (
              <View style={styles.checkoutStepContainer}>
                {/* Header */}
                <View style={styles.overlayHeader}>
                  <TouchableOpacity onPress={() => setCheckoutStep('idle')} style={styles.backBtn}>
                    <Text style={{ fontSize: 20, color: '#1E293B' }}>⬅️</Text>
                  </TouchableOpacity>
                  <Text style={styles.overlayTitle}>📍 Delivery Details</Text>
                </View>

                {/* Map Preview centered on selected hostel */}
                <View style={styles.addressMapSection}>
                  <CustomerMap
                    driverLocation={null}
                    destinationLocation={deliveryCoords || HOSTEL_COORDS[addressHostel] || { lat: 28.6139, lng: 77.2090 }}
                    destinationName={addressHostel || 'Your Delivery Location'}
                    interactive={true}
                    onLocationSelect={async (lat, lng) => {
                      setDeliveryCoords({ lat, lng });
                      const placeName = await fetchPlaceName(lat, lng);
                      setAddressHostel(placeName);
                    }}
                  />
                </View>

                <ScrollView style={styles.checkoutForm} showsVerticalScrollIndicator={false}>
                  {/* Geolocation and Autofill Actions Row */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    {(!!user.addressLine || !!user.city || !!user.phone) && (
                      <TouchableOpacity
                        style={[styles.autofillBtn, { flex: 1, marginBottom: 0 }]}
                        onPress={() => {
                          setAddressHostel(user.addressLine || 'Boys Hostel 3');
                          setAddressRoom(user.city || '');
                          setDeliveryPhone(user.phone || '');
                          if (user.latitude && user.longitude) {
                            setDeliveryCoords({ lat: user.latitude, lng: user.longitude });
                          } else {
                            setDeliveryCoords(null);
                          }
                          Alert.alert('⚡ Autofilled!', 'Apka saved profile details fill ho gaya hai.');
                        }}
                      >
                        <Text style={styles.autofillBtnText}>⚡ Autofill Saved</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.gpsBtn, { flex: 1, marginBottom: 0 }]}
                      onPress={handleDetectLocation}
                      disabled={fetchingGps}
                    >
                      <Text style={styles.gpsBtnText}>
                        {fetchingGps ? '🛰️ Locating...' : '📍 GPS Live Location'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Name Input if not set or set to New Student */}
                  {(user.name === 'New Student' || !user.name || user.name.trim() === '') && (
                    <>
                      <Text style={styles.formLabel}>Your Name *</Text>
                      <TextInput
                        style={styles.formInput}
                        value={customerName}
                        onChangeText={setCustomerName}
                        placeholder="Enter your full name"
                        placeholderTextColor="#94A3B8"
                      />
                    </>
                  )}

                  <Text style={styles.formLabel}>Hostel / Block Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={addressHostel}
                    onChangeText={setAddressHostel}
                    placeholder="e.g. Hostel H / PG Block B"
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={styles.formLabel}>Room / Room number *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={addressRoom}
                    onChangeText={setAddressRoom}
                    placeholder="e.g. Room 302 / 3rd Floor"
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={styles.formLabel}>Delivery Phone Number *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={deliveryPhone}
                    onChangeText={setDeliveryPhone}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />

                  {/* Referral Code input if not referred yet */}
                  {!user.referredBy && (
                    <>
                      <Text style={styles.formLabel}>Referral Code (Optional)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={referralCode}
                        onChangeText={setReferralCode}
                        placeholder="e.g. TIFFIN1234 (Credits ₹50)"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="characters"
                      />
                    </>
                  )}

                  <Text style={styles.formLabel}>Special Delivery Instructions (Optional)</Text>
                  <TextInput
                    style={[styles.formInput, { minHeight: 60, textAlignVertical: 'top' }]}
                    value={deliveryInstructions}
                    onChangeText={setDeliveryInstructions}
                    placeholder="e.g. Leave at hostel gate / Call upon arrival"
                    placeholderTextColor="#94A3B8"
                    multiline
                  />

                  <TouchableOpacity
                    style={styles.checkoutSubmitBtn}
                    onPress={async () => {
                      const needsName = user.name === 'New Student' || !user.name || user.name.trim() === '';
                      if (needsName && !customerName.trim()) {
                        Alert.alert('Required Info', 'Apka naam daalna zaroori hai.');
                        return;
                      }
                      if (!addressHostel.trim()) {
                        Alert.alert('Required Info', 'Hostel/Block name daalna zaroori hai.');
                        return;
                      }
                      if (!addressRoom.trim()) {
                        Alert.alert('Required Info', 'Room number/Floor name daalna zaroori hai.');
                        return;
                      }
                      if (!deliveryPhone.trim() || deliveryPhone.trim().length < 10) {
                        Alert.alert('Required Info', 'Valid 10-digit phone number daalna zaroori hai.');
                        return;
                      }

                      try {
                        setCheckoutStep('confirming');
                        
                        const profileUpdateData: any = {
                          addressLine: addressHostel.trim(),
                          city: addressRoom.trim(),
                          phone: deliveryPhone.trim(),
                          latitude: deliveryCoords?.lat || null,
                          longitude: deliveryCoords?.lng || null
                        };

                        if (needsName) {
                          profileUpdateData.name = customerName.trim();
                        }
                        if (referralCode.trim() && !user.referredBy) {
                          profileUpdateData.referralCode = referralCode.trim();
                        }

                        const { data } = await api.put('/auth/profile', profileUpdateData);
                        if (data.success) {
                          setUser(data.user);
                          if (referralCode.trim() && data.user.referredBy) {
                            Alert.alert('🎁 Referral Success!', 'Referral code verify ho gaya! Apke wallet me ₹50 credit kar diye gaye hain.');
                          }
                          setCheckoutStep('payment');
                        }
                      } catch (e: any) {
                        console.error('Checkout address update error:', e);
                        Alert.alert('Error', e.response?.data?.message || e.message || 'Something went wrong.');
                        setCheckoutStep('address');
                      }
                    }}
                  >
                    <Text style={styles.checkoutSubmitBtnText}>Proceed to Payment ➡️</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

            {/* Step 3: Payment Method Selection */}
            {checkoutStep === 'payment' && (
              <View style={styles.checkoutStepContainer}>
                {/* Header */}
                <View style={styles.overlayHeader}>
                  <TouchableOpacity onPress={() => setCheckoutStep('address')} style={styles.backBtn}>
                    <Text style={{ fontSize: 20, color: '#1E293B' }}>⬅️</Text>
                  </TouchableOpacity>
                  <Text style={styles.overlayTitle}>💳 Select Payment</Text>
                </View>

                <ScrollView style={styles.checkoutForm} showsVerticalScrollIndicator={false}>
                  {/* Pricing breakdown summary */}
                  <View style={styles.priceSummary}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={styles.priceSub}>Subtotal ({cartTotalQty} items)</Text>
                      <Text style={styles.priceVal}>₹{totalAmount}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={styles.priceSub}>Delivery Charge</Text>
                      <Text style={styles.priceVal}>₹{activeRestaurant?.deliveryFee || 0}</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.priceTotalLabel}>Grand Total</Text>
                      <Text style={styles.priceTotalVal}>₹{grandTotal}</Text>
                    </View>
                  </View>

                  <Text style={[styles.formLabel, { marginBottom: 10 }]}>Payment Option:</Text>

                  {/* COD Option */}
                  <TouchableOpacity
                    style={[styles.payCard, paymentMode === 'COD' && styles.payCardActive]}
                    onPress={() => setPaymentMode('COD')}
                  >
                    <Text style={{ fontSize: 24 }}>💵</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.payCardTitle}>Cash on Delivery (COD)</Text>
                      <Text style={styles.payCardText}>Pay in cash when rider delivers to your room</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Wallet Option */}
                  <TouchableOpacity
                    style={[
                      styles.payCard,
                      paymentMode === 'Wallet' && styles.payCardActive,
                      user.walletBalance < grandTotal && { opacity: 0.6 }
                    ]}
                    onPress={() => setPaymentMode('Wallet')}
                  >
                    <Text style={{ fontSize: 24 }}>💰</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.payCardTitle}>My Tiffin Wallet</Text>
                      <Text style={styles.walletInfoText}>
                        Current Balance: ₹{user.walletBalance}
                      </Text>
                      {user.walletBalance < grandTotal && (
                        <Text style={styles.insufficientText}>⚠️ Insufficient Wallet Balance</Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* UPI Online Option */}
                  <TouchableOpacity
                    style={[styles.payCard, paymentMode === 'Online' && styles.payCardActive]}
                    onPress={() => setPaymentMode('Online')}
                  >
                    <Text style={{ fontSize: 24 }}>📱</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.payCardTitle}>Scan QR Code & Pay (UPI)</Text>
                      <Text style={styles.payCardText}>Pay using GPay, PhonePe, Paytm, or BHIM</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.checkoutSubmitBtn, { marginTop: 24 }]}
                    onPress={handlePlaceOrder}
                  >
                    <Text style={styles.checkoutSubmitBtnText}>
                      {paymentMode === 'Online'
                        ? `Proceed to Pay ₹${grandTotal}`
                        : `Place Order (₹${grandTotal})`}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

            {/* Step 4: UPI Scan & Verify */}
            {checkoutStep === 'scanning' && (
              <View style={styles.checkoutStepContainer}>
                {/* Header */}
                <View style={styles.overlayHeader}>
                  <TouchableOpacity onPress={() => setCheckoutStep('payment')} style={styles.backBtn}>
                    <Text style={{ fontSize: 20, color: '#1E293B' }}>⬅️</Text>
                  </TouchableOpacity>
                  <Text style={styles.overlayTitle}>Scan & Paid Verification</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scannerContainer} style={styles.checkoutForm} showsVerticalScrollIndicator={false}>
                  <Text style={styles.upiTitle}>📸 Scan QR to Pay</Text>
                  <Text style={styles.upiSub}>Scan barcode with GPay, PhonePe, or Paytm</Text>
                  
                  {/* Merchant QR Code */}
                  <View style={styles.qrCodeWrapper}>
                    <Image
                      source={{
                        uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                          `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
                            merchantName
                          )}&am=${grandTotal}&cu=INR&tn=Tiffin%20Restaurant%20Order`
                        )}`,
                      }}
                      style={styles.qrImageInside}
                      resizeMode="contain"
                    />
                  </View>

                  <Text style={styles.merchantLabel}>Amount to Pay</Text>
                  <Text style={styles.merchantAmount}>₹{grandTotal}</Text>
                  <Text style={styles.merchantInfo}>UPI ID: {upiId}</Text>
                  <Text style={styles.merchantName}>{merchantName}</Text>
                  
                  {/* 12-digit UTR Input Section */}
                  <View style={styles.utrInputWrapper}>
                    <Text style={styles.utrLabel}>Enter UPI Ref / UTR No. (12-Digit) *</Text>
                    <TextInput
                      style={styles.utrInput}
                      placeholder="e.g. 618930492812"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={12}
                      value={utrCode}
                      onChangeText={setUtrCode}
                    />
                  </View>
                  
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 18, width: '100%' }}>
                    <TouchableOpacity style={[styles.upiBtnCancel, { flex: 1 }]} onPress={() => setCheckoutStep('payment')}>
                      <Text style={styles.upiBtnTextCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.upiBtnPay, { flex: 2 }, (!utrCode || utrCode.trim().length < 12) && { opacity: 0.5 }]} 
                      disabled={!utrCode || utrCode.trim().length < 12}
                      onPress={() => completeOrderInsertion('Online')}
                    >
                      <Text style={styles.upiBtnTextPay}>I have Paid ✅</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Step 5: Loading confirming indicator screen */}
            {checkoutStep === 'confirming' && (
              <View style={styles.loadingSheetContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Processing Payment & Confirming Order...</Text>
              </View>
            )}

            {/* Item Detail Overlay (Slide-up bottom drawer style) */}
            {selectedMenuItem && (
              <Animated.View style={[styles.detailOverlayBackdrop, { opacity: detailBackdropOpacity }]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => closeDetailOverlay()} />
                <Animated.View style={[styles.detailOverlayWrapper, { transform: [{ translateY: detailSlideAnim }] }]}>
                  <ScrollView ref={detailScrollRef} style={styles.detailScroll} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
                    {/* Big Image with Floating Back Button & Veg badge */}
                    <View style={{ position: 'relative', paddingHorizontal: 16, paddingTop: 16 }}>
                      <Image source={{ uri: selectedMenuItem.image }} style={{ width: '100%', height: 300, resizeMode: 'cover', borderRadius: Radius.lg || 16 }} />
                      <TouchableOpacity 
                        onPress={() => closeDetailOverlay()} 
                        style={{ 
                          position: 'absolute', 
                          top: 28, 
                          left: 28, 
                          width: 36, 
                          height: 36, 
                          borderRadius: 18, 
                          backgroundColor: '#FFFFFF', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.15,
                          shadowRadius: 3,
                          elevation: 4,
                          zIndex: 10
                        }}
                      >
                        <Text style={{ fontSize: 18, color: '#1E293B', fontWeight: 'bold' }}>←</Text>
                      </TouchableOpacity>

                      {/* Veg/Non-Veg Floating badge inside image */}
                      <View 
                        style={{ 
                          position: 'absolute', 
                          bottom: 12, 
                          right: 28, 
                          backgroundColor: '#FFFFFF', 
                          borderRadius: 4, 
                          padding: 4,
                          borderWidth: 1,
                          borderColor: selectedMenuItem.isVeg ? '#10B981' : '#EF4444',
                          zIndex: 10
                        }}
                      >
                        <View style={{ 
                          width: 10, 
                          height: 10, 
                          borderRadius: 5, 
                          backgroundColor: selectedMenuItem.isVeg ? '#10B981' : '#EF4444' 
                        }} />
                      </View>
                    </View>

                    {/* Details Container */}
                    <View style={styles.detailInfoContainer}>
                      {/* Name & Strikethrough pricing row & ADD button */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text style={{ fontSize: 22, fontFamily: Typography.fontFamily.bold, color: '#1E293B', marginBottom: 6 }}>
                            {selectedMenuItem.name}
                          </Text>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{ backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                              <Text style={{ fontSize: 13, fontFamily: Typography.fontFamily.bold, color: '#FFFFFF' }}>
                                ₹{selectedMenuItem.price}
                              </Text>
                            </View>
                            
                            {selectedMenuItem.originalPrice && selectedMenuItem.originalPrice > selectedMenuItem.price && (
                              <>
                                <Text style={{ fontSize: 13, textDecorationLine: 'line-through', color: '#94A3B8' }}>
                                  ₹{selectedMenuItem.originalPrice}
                                </Text>
                                <View style={{ backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 11, color: '#16A34A', fontFamily: Typography.fontFamily.bold }}>
                                    {Math.round(((selectedMenuItem.originalPrice - selectedMenuItem.price) / selectedMenuItem.originalPrice) * 100)}% OFF
                                  </Text>
                                </View>
                              </>
                            )}
                          </View>
                        </View>

                        {/* Clean Zomato-style ADD button */}
                        <TouchableOpacity
                          style={{
                            width: 80,
                            height: 34,
                            backgroundColor: '#F0FDF4',
                            borderColor: '#10B981',
                            borderWidth: 1.5,
                            borderRadius: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#10B981',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.1,
                            shadowRadius: 2,
                            elevation: 1
                          }}
                          onPress={() => {
                            setCustomizingItem(selectedMenuItem);
                          }}
                        >
                          <Text style={{ color: '#10B981', fontSize: 14, fontFamily: Typography.fontFamily.bold }}>
                            Add
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Description Header and text */}
                      <View style={{ marginTop: 12 }}>
                        <Text style={{ fontSize: 15, fontFamily: Typography.fontFamily.bold, color: '#1E293B', marginBottom: 6 }}>
                          About the product
                        </Text>
                        <Text style={{ fontSize: 13, color: '#64748B', lineHeight: 18, fontFamily: Typography.fontFamily.regular }}>
                          {selectedMenuItem.description || 'No description available for this item.'}
                        </Text>
                      </View>

                      {/* ── Quick Search inside item detail — same design as outer bar ── */}
                      <View style={{ marginTop: 20, marginBottom: 4 }}>
                        <Text style={{ fontSize: 14, fontFamily: Typography.fontFamily.bold, color: '#1E293B', marginBottom: 10 }}>
                          🔍 Search More Items
                        </Text>
                        <View style={styles.menuSearchRow}>
                          <Text style={styles.searchIcon}>🔍</Text>
                          <TextInput
                            style={styles.searchInput}
                            placeholder="Search items…"
                            placeholderTextColor="#94A3B8"
                            value={menuSearchQuery}
                            onChangeText={text => {
                              setMenuSearchQuery(text);
                              setSelectedMenuItem(null);
                            }}
                            returnKeyType="search"
                          />
                          {menuSearchQuery.length > 0 && (
                            <TouchableOpacity
                              onPress={() => setMenuSearchQuery('')}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={{ marginRight: 6 }}
                            >
                              <Text style={{ fontSize: 15, color: '#94A3B8', fontWeight: 'bold' }}>✕</Text>
                            </TouchableOpacity>
                          )}
                          {/* Filter funnel */}
                          <TouchableOpacity
                            onPress={() => setShowMenuFilter(v => !v)}
                            activeOpacity={0.7}
                            style={[
                              styles.filterFunnelBtn,
                              (showMenuFilter || menuPriceFilter !== 'all') && styles.filterFunnelBtnActive,
                            ]}
                          >
                            <Text style={{ fontSize: 14, lineHeight: 18 }}>⚙️</Text>
                            {menuPriceFilter !== 'all' && (
                              <View style={styles.filterActiveDot} />
                            )}
                          </TouchableOpacity>
                        </View>

                        {/* Dropdown filter box */}
                        {showMenuFilter && (
                          <View style={styles.filterDropdownBox}>
                            <Text style={styles.filterDropdownTitle}>💰 Filter by Price</Text>
                            <View style={styles.filterDropdownGrid}>
                              {(
                                [
                                  { key: 'all',      label: 'All Prices',   sub: 'Show everything' },
                                  { key: 'under50',  label: 'Under ₹50',    sub: 'Budget friendly' },
                                  { key: 'under100', label: 'Under ₹100',   sub: 'Most popular' },
                                  { key: 'under150', label: 'Under ₹150',   sub: 'Mid range' },
                                  { key: 'above150', label: '₹150 & above', sub: 'Premium dishes' },
                                ] as { key: typeof menuPriceFilter; label: string; sub: string }[]
                              ).map(opt => (
                                <TouchableOpacity
                                  key={opt.key}
                                  onPress={() => {
                                    setMenuPriceFilter(opt.key);
                                    setShowMenuFilter(false);
                                    setSelectedMenuItem(null);
                                  }}
                                  activeOpacity={0.75}
                                  style={[
                                    styles.filterOptionCard,
                                    menuPriceFilter === opt.key && styles.filterOptionCardActive,
                                  ]}
                                >
                                  <Text style={[
                                    styles.filterOptionLabel,
                                    menuPriceFilter === opt.key && styles.filterOptionLabelActive,
                                  ]}>
                                    {opt.label}
                                  </Text>
                                  <Text style={[
                                    styles.filterOptionSub,
                                    menuPriceFilter === opt.key && { color: Colors.primary },
                                  ]}>
                                    {opt.sub}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>

                      {/* Recommended "People also like this" scrolling row */}
                      {(() => {
                        const recs = viewingRestaurant
                          ? viewingRestaurant.menu.filter((m: any) => m.id !== selectedMenuItem.id)
                          : [];
                        if (recs.length === 0) return null;
                        return (
                          <View style={{ marginTop: 24 }}>
                            <Text style={{ fontSize: 15, fontFamily: Typography.fontFamily.bold, color: '#1E293B', marginBottom: 12 }}>
                              People also like this
                            </Text>
                            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                              {recs.slice(0, 5).map((recItem: any) => {
                                const isRecAvailable = recItem.isAvailable !== false;
                                return (
                                  <TouchableOpacity 
                                    key={recItem.id}
                                    activeOpacity={0.9}
                                    onPress={() => {
                                      setSelectedMenuItem(recItem);
                                    }}
                                    style={{ 
                                      width: 140, 
                                      marginRight: 12, 
                                      backgroundColor: '#FFFFFF', 
                                      borderRadius: 12, 
                                      overflow: 'hidden', 
                                      borderWidth: 1, 
                                      borderColor: '#E2E8F0',
                                      paddingBottom: 8
                                    }}
                                  >
                                    <View style={{ position: 'relative', width: '100%', height: 110 }}>
                                      <Image source={{ uri: recItem.image }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                                      
                                      {/* Veg badge floating on image */}
                                      <View 
                                        style={{ 
                                          position: 'absolute', 
                                          top: 8, 
                                          left: 8, 
                                          backgroundColor: '#FFFFFF', 
                                          borderRadius: 3, 
                                          padding: 2,
                                          borderWidth: 0.5,
                                          borderColor: recItem.isVeg ? '#10B981' : '#EF4444',
                                          zIndex: 2
                                        }}
                                      >
                                        <View style={{ 
                                          width: 6, 
                                          height: 6, 
                                          borderRadius: 3, 
                                          backgroundColor: recItem.isVeg ? '#10B981' : '#EF4444' 
                                        }} />
                                      </View>

                                      {/* Float ADD button inside recommended card */}
                                      {isRecAvailable && (
                                        <TouchableOpacity
                                          style={{
                                            position: 'absolute',
                                            bottom: 6,
                                            right: 6,
                                            backgroundColor: '#FFFFFF',
                                            borderColor: '#10B981',
                                            borderWidth: 1,
                                            borderRadius: 4,
                                            paddingHorizontal: 8,
                                            paddingVertical: 2,
                                            zIndex: 2,
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: 0.1,
                                            shadowRadius: 1,
                                            elevation: 1
                                          }}
                                          onPress={() => {
                                            setCustomizingItem(recItem);
                                          }}
                                        >
                                          <Text style={{ fontSize: 10, color: '#10B981', fontWeight: 'bold' }}>Add</Text>
                                        </TouchableOpacity>
                                      )}
                                    </View>

                                    {/* Name & Price */}
                                    <View style={{ paddingHorizontal: 8, paddingTop: 6 }}>
                                      <Text style={{ fontSize: 12, fontFamily: Typography.fontFamily.semiBold, color: '#1E293B' }} numberOfLines={1}>
                                        {recItem.name}
                                      </Text>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                                        <Text style={{ fontSize: 11, fontFamily: Typography.fontFamily.bold, color: '#f97316' }}>
                                          ₹{recItem.price}
                                        </Text>
                                        {recItem.originalPrice && recItem.originalPrice > recItem.price && (
                                          <Text style={{ fontSize: 9, textDecorationLine: 'line-through', color: '#94A3B8' }}>
                                            ₹{recItem.originalPrice}
                                          </Text>
                                        )}
                                      </View>
                                    </View>
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          </View>
                        );
                      })()}

                      <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 }} />

                      {/* Reviews list */}
                      <Text style={styles.detailReviewsTitle}>💬 Campus Feedbacks</Text>
                      {loadingReviews ? (
                        <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
                      ) : itemReviews.length > 0 ? (
                        itemReviews.map((rev) => (
                          <View key={rev._id || rev.id} style={styles.reviewItemCard}>
                            <View style={styles.reviewCardHeader}>
                              <Text style={styles.reviewerName}>{rev.userName || 'Verified Student'}</Text>
                              <View style={styles.reviewStarsMini}>
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Text key={i} style={{ color: i < rev.rating ? '#F59E0B' : '#E2E8F0', fontSize: 12 }}>★</Text>
                                ))}
                              </View>
                            </View>
                            {rev.comment ? <Text style={styles.reviewCommentText}>{rev.comment}</Text> : null}
                            <Text style={styles.reviewDate}>{new Date(rev.createdAt).toLocaleDateString()}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noReviewsPrompt}>No reviews for this dish yet. Be the first to order and leave a review!</Text>
                      )}
                    </View>
                    <View style={{ height: 60 }} />
                  </ScrollView>
                </Animated.View>
              </Animated.View>
            )}

          </View>
        </View>
      )}
      {/* Customization Add-ons Bottom Sheet (Popup Type) */}
      {customizingItem && (
        <Animated.View style={[styles.customOverlayBackdrop, { opacity: customBackdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => closeCustomizingOverlay()} />
          <Animated.View style={[styles.customSheetContainer, { transform: [{ translateY: customSlideAnim }] }]}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.customSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.customSheetTitle}>{customizingItem.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Text style={styles.customSheetSubPrice}>Base Price: ₹{customizingItem.price}</Text>
                  {customizingItem.originalPrice && customizingItem.originalPrice > customizingItem.price && (
                    <>
                      <Text style={{ fontSize: 13, textDecorationLine: 'line-through', color: '#94A3B8' }}>
                        ₹{customizingItem.originalPrice}
                      </Text>
                      <View style={{ backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: '#16A34A', fontFamily: Typography.fontFamily.bold }}>
                          {Math.round(((customizingItem.originalPrice - customizingItem.price) / customizingItem.originalPrice) * 100)}% OFF
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => closeCustomizingOverlay()} style={styles.customCloseBtn}>
                <Text style={{ fontSize: 20, color: '#6B7280' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.customSheetScroll} showsVerticalScrollIndicator={false}>
              {/* Description */}
              {customizingItem.description ? (
                <Text style={styles.customItemDesc}>{customizingItem.description}</Text>
              ) : null}

              {/* Add-ons Checklist Section */}
              <View style={styles.customAddonsSection}>
                <Text style={styles.customSectionTitle}>➕ Select Add-ons (Optional)</Text>
                <Text style={styles.customSectionSub}>Customize your meal with campus favorites</Text>
                
                <View style={styles.customAddonsList}>
                  {campusAddons.map((ad) => {
                    const isSelected = selectedAddons.includes(ad);
                    const price = ADDON_PRICES[ad];
                    return (
                      <TouchableOpacity
                        key={ad}
                        style={[styles.customAddonRow, isSelected && styles.customAddonRowActive]}
                        onPress={() => {
                          setSelectedAddons(prev =>
                            prev.includes(ad) ? prev.filter(x => x !== ad) : [...prev, ad]
                          );
                        }}
                      >
                        <View style={[styles.customCheckbox, isSelected && styles.customCheckboxActive]}>
                          {isSelected && <Text style={styles.customCheckmark}>✓</Text>}
                        </View>
                        <Text style={styles.customAddonLabel}>{ad}</Text>
                        <Text style={styles.customAddonPrice}>+₹{price}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 }} />

              {/* Quantity Stepper Row */}
              {customizingItem.isAvailable !== false && (
                <View style={styles.customQtyRow}>
                  <Text style={styles.customQtyLabel}>Quantity</Text>
                  <View style={styles.customQtyControls}>
                    <TouchableOpacity onPress={() => setTempQty(prev => Math.max(1, prev - 1))} style={styles.qtyBtnDetail}>
                      <Text style={styles.qtyBtnTextDetail}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValDetail}>{tempQty}</Text>
                    <TouchableOpacity onPress={() => setTempQty(prev => prev + 1)} style={styles.qtyBtnDetail}>
                      <Text style={styles.qtyBtnTextDetail}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Bottom Add to Cart & Price Row (Separated with different colors) */}
            <View style={styles.customSheetFooter}>
              <View style={styles.customPriceBlock}>
                <Text style={styles.customPriceLabel}>Total Price</Text>
                <Text style={styles.customPriceValue}>
                  ₹{(customizingItem.price + selectedAddons.reduce((sum, ad) => sum + (ADDON_PRICES[ad] || 0), 0)) * tempQty}
                </Text>
              </View>
              {customizingItem.isAvailable === false ? (
                <TouchableOpacity style={[styles.customAddToCartBtn, { backgroundColor: '#94A3B8' }]} disabled={true}>
                  <Text style={styles.customAddToCartBtnText}>Out of Stock 😞</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  {cart[customizingItem.id] > 0 && (
                    <TouchableOpacity 
                      style={[styles.customAddToCartBtn, { backgroundColor: '#EF4444', paddingHorizontal: 14 }]} 
                      onPress={() => {
                        setCart(prev => {
                          const next = { ...prev };
                          delete next[customizingItem.id];
                          return next;
                        });
                        closeCustomizingOverlay(() => {
                          Alert.alert('🗑️ Item Removed', `${customizingItem.name} has been removed from cart.`);
                        });
                      }}
                    >
                      <Text style={styles.customAddToCartBtnText}>Cancel Item ❌</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.customAddToCartBtn, { paddingHorizontal: 14 }]} onPress={handleCustomAddToCart}>
                    <Text style={styles.customAddToCartBtnText}>
                      {cart[customizingItem.id] > 0 ? 'Update Cart 🛒' : 'Add to Cart 🛒'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      )}
      {activeReviewItem && (
        <Animated.View style={[styles.reviewSheetOverlay, { opacity: reviewBackdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => closeReviewOverlay()} />
          <Animated.View style={[styles.reviewSheetContainer, { transform: [{ translateY: reviewSlideAnim }] }]}>
            <View style={styles.reviewSheetHeader}>
              <Text style={styles.reviewSheetTitle}>⭐ Rate {activeReviewItem.name}</Text>
              <TouchableOpacity onPress={() => closeReviewOverlay()} style={styles.reviewSheetClose}>
                <Text style={{ fontSize: 20, color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.reviewStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setProductRating(star)}>
                  <Text style={[styles.reviewStar, productRating >= star && styles.reviewStarActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewTextInput}
              placeholder="Kuch comment likhein (Optional)..."
              placeholderTextColor="#94A3B8"
              value={productComment}
              onChangeText={setProductComment}
              maxLength={150}
            />

            <TouchableOpacity
              onPress={handleSubmittingProductReview}
              disabled={productRating === 0 || reviewLoading}
              style={[styles.reviewSubmitBtn, productRating === 0 && { opacity: 0.5 }]}
            >
              <Text style={styles.reviewSubmitBtnText}>
                {reviewLoading ? 'Submitting...' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}

      {/* Global Unified Floating Checkout Drawer */}
      {cartTotalQty > 0 && checkoutStep === 'idle' && (
        <View style={[styles.detailCheckoutDrawer, { bottom: viewingRestaurant ? 20 : 90 }]}>
          <View style={styles.detailCartSummaryRow}>
            <View>
              <Text style={styles.detailCartSummaryText}>Total: ₹{grandTotal}</Text>
              <Text style={styles.detailCartItemsCount}>{cartTotalQty} {cartTotalQty === 1 ? 'item' : 'items'} in cart</Text>
            </View>
            <TouchableOpacity 
              style={styles.detailProceedCheckoutBtn} 
              onPress={() => {
                if (!viewingRestaurant && activeRestaurant) {
                  setViewingRestaurant(activeRestaurant);
                }
                if (selectedMenuItem) {
                  closeDetailOverlay(() => {
                    setCheckoutStep('address');
                  });
                } else {
                  setCheckoutStep('address');
                }
              }}
            >
              <Text style={styles.detailProceedCheckoutBtnText}>Proceed to Checkout ➡️</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Dynamic Falling Leaves & Glow effect for "Veg Only" Mode */}
      {showVegEffect && (
        <Animated.View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#022c22',
            opacity: vegAnim.interpolate({
              inputRange: [0, 0.2, 0.8, 1],
              outputRange: [0, 0.25, 0.25, 0]
            }),
            zIndex: 99999,
            pointerEvents: 'none'
          }}
        />
      )}

      {showVegEffect && (
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100000,
            pointerEvents: 'none',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Floating Leaves */}
          <Animated.Text
            style={{
              position: 'absolute',
              left: '10%',
              fontSize: 32,
              opacity: vegAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateY: vegAnim.interpolate({ inputRange: [0, 1], outputRange: [400, -200] }) },
                { rotate: vegAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }
              ]
            }}
          >
            🍃
          </Animated.Text>
          <Animated.Text
            style={{
              position: 'absolute',
              left: '30%',
              fontSize: 28,
              opacity: vegAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateY: vegAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 50] }) },
                { rotate: vegAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-60deg'] }) }
              ]
            }}
          >
            🌿
          </Animated.Text>
          <Animated.Text
            style={{
              position: 'absolute',
              left: '50%',
              fontSize: 36,
              opacity: vegAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateY: vegAnim.interpolate({ inputRange: [0, 1], outputRange: [300, -100] }) },
                { rotate: vegAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }
              ]
            }}
          >
            🥗
          </Animated.Text>
          <Animated.Text
            style={{
              position: 'absolute',
              left: '70%',
              fontSize: 26,
              opacity: vegAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateY: vegAnim.interpolate({ inputRange: [0, 1], outputRange: [450, 0] }) },
                { rotate: vegAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-30deg'] }) }
              ]
            }}
          >
            🍃
          </Animated.Text>
          <Animated.Text
            style={{
              position: 'absolute',
              left: '88%',
              fontSize: 30,
              opacity: vegAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateY: vegAnim.interpolate({ inputRange: [0, 1], outputRange: [350, -150] }) },
                { rotate: vegAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '120deg'] }) }
              ]
            }}
          >
            🌿
          </Animated.Text>

          {/* Premium Glassmorphism Pure Veg Badge */}
          <Animated.View
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: 30,
              borderWidth: 1.5,
              borderColor: '#022c22',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              shadowColor: '#022c22',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
              opacity: vegAnim.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { scale: vegAnim.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0.8, 1.05, 1, 0.9] }) }
              ]
            }}
          >
            {/* Standard Veg Square Dot Symbol */}
            <View style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              borderWidth: 2,
              borderColor: '#022c22',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <View style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#022c22'
              }} />
            </View>
            <Text style={{
              fontFamily: Typography.fontFamily.bold,
              fontSize: Typography.fontSize.sm,
              color: '#022c22',
              letterSpacing: 0.5
            }}>
              Pure Veg Mode Active
            </Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: Colors.surface,
    paddingTop: 55,
    paddingBottom: 16,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.textPrimary,
  },
  headerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 14,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 10, color: '#94A3B8' },
  searchInput: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: '#1E293B',
    padding: 0,
    borderWidth: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  cuisineScroll: {
    paddingHorizontal: Spacing.md,
  },
  cuisineChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    alignSelf: 'center',
  },
  cuisineChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  cuisineChipText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  cuisineChipTextActive: {
    color: Colors.textOnPrimary,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: 4,
  },
  resCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  resImg: {
    width: '100%',
    height: 160,
    backgroundColor: '#CBD5E1',
  },
  cuisineTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 69, 0, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  cuisineTagText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    color: Colors.textOnPrimary,
    textTransform: 'uppercase',
  },
  resCardInfo: {
    padding: Spacing.md,
  },
  resRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  ratingBadge: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    fontSize: 10,
    marginRight: 3,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  ratingText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.accent,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  resDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  resMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  metaDivider: { color: Colors.border, fontSize: 10 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTxt: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Modal Wrapper (Nested Absolute to lock inside the web mobile viewframe)
  modalWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FAFAFA',
    zIndex: 100,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 55,
    paddingBottom: 16,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  modalSub: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  modalScroll: { flex: 1 },
  menuLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginVertical: Spacing.sm,
  },
  categoryBarContainer: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 10,
  },
  categoryBarScroll: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.subtle,
  },
  menuCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuItemEmoji: { fontSize: 32 },
  menuItemName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  menuItemPrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    marginTop: 2,
  },
  menuItemDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.textSecondary,
    marginTop: 2,
    marginRight: 10,
  },
  qtyContainer: {
    alignItems: 'flex-end',
    width: 90,
  },
  qtyControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: Radius.full,
    padding: 2,
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
  addBtn: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    borderWidth: 1.5,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Colors.primary,
  },

  // Checkout Drawer
  checkoutDrawer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.md,
    paddingBottom: 28,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 69, 0, 0.25)',
    ...Shadows.card,
  },
  payModeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  payModeLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
  },
  payButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  payMethodBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  payMethodBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  payMethodText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  payMethodTextActive: {
    color: Colors.primary,
  },
  priceSummary: {
    backgroundColor: '#FAF8F5',
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 12,
  },
  priceSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  priceVal: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
  },
  priceTotalLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  priceTotalVal: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
  },
  placeOrderBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textOnPrimary,
  },

  // QR scanner & details styling
  scannerContainer: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  upiTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  upiSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: 4,
  },
  qrCodeWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignSelf: 'center',
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  qrImageInside: {
    width: 180,
    height: 180,
  },
  merchantLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  merchantAmount: {
    fontSize: 26,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#D97706',
    marginVertical: 2,
  },
  merchantInfo: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  merchantName: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
  },
  utrInputWrapper: {
    width: '100%',
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  utrLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  utrInput: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    paddingVertical: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.primary,
  },
  upiBtnCancel: {
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiBtnTextCancel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  upiBtnPay: {
    backgroundColor: '#2ECC71',
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiBtnTextPay: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: '#FFFFFF',
  },

  // Loading indicator sheet
  loadingSheet: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 10,
  },

  // Menu Item redesign & review popup styles
  menuItemImageWrapper: {
    width: 75,
    height: 75,
    position: 'relative',
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  menuItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  vegBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  vegBadgeText: {
    fontSize: 7.5,
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
    textTransform: 'uppercase',
  },
  menuCardDetails: {
    flex: 1,
    paddingLeft: Spacing.sm,
    justifyContent: 'space-between',
  },
  productRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  productRatingBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  productRatingText: {
    fontSize: 9.5,
    color: '#D97706',
    fontFamily: Typography.fontFamily.semiBold,
  },
  noRatingText: {
    fontSize: 9.5,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
    fontStyle: 'italic',
  },
  productRateBtn: {
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  productRateBtnText: {
    fontSize: 9.5,
    color: '#F59E0B',
    fontFamily: Typography.fontFamily.semiBold,
  },
  reviewSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  reviewSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.md,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  reviewSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reviewSheetTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  reviewSheetClose: {
    padding: 4,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginVertical: 12,
  },
  reviewStar: {
    fontSize: 32,
    color: '#E2E8F0',
  },
  reviewStarActive: {
    color: '#F59E0B',
  },
  reviewTextInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    padding: 10,
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    minHeight: 48,
    marginBottom: Spacing.sm,
  },
  reviewSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reviewSubmitBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textOnPrimary,
  },
  
  // Checkout & Step overlays
  checkoutStepContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 55,
    paddingBottom: 16,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  overlayTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  checkoutForm: {
    flex: 1,
    padding: Spacing.md,
  },
  autofillBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Shadows.subtle,
  },
  autofillBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: '#059669',
  },
  gpsBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Shadows.subtle,
  },
  gpsBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: '#2563EB',
  },
  formLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    padding: 12,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  checkoutSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 40,
    ...Shadows.card,
  },
  checkoutSubmitBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textOnPrimary,
  },
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    ...Shadows.subtle,
  },
  payCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  payCardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  payCardText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  walletInfoText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    marginTop: 2,
  },
  insufficientText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: '#EF4444',
    marginTop: 4,
  },
  cartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cartSummaryText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  cartItemsCount: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  proceedCheckoutBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.full,
    ...Shadows.card,
  },
  proceedCheckoutBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textOnPrimary,
  },
  loadingSheetContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    padding: 40,
  },

  // Item Detail styles
  detailOverlayWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FAFAFA',
    zIndex: 200,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 55,
    paddingBottom: 16,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  detailCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  detailHeaderTitle: {
    flex: 1,
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  detailScroll: {
    flex: 1,
  },
  detailBigImg: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
    backgroundColor: '#CBD5E1',
  },
  detailInfoContainer: {
    padding: Spacing.md,
  },
  detailNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailName: {
    flex: 1,
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  detailPrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.primary,
    marginLeft: 12,
  },
  vegBadgeDetail: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  vegBadgeTextDetail: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  detailRatingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  detailRatingText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 10,
    color: '#D97706',
  },
  detailDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 10,
  },
  detailQtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailQtyLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  qtyContainerDetail: {
    alignItems: 'flex-end',
  },
  qtyControlsRowDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderWidth: 1.5,
    borderRadius: Radius.full,
    padding: 3,
  },
  qtyBtnDetail: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnTextDetail: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  qtyValDetail: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: '#FFFFFF',
    paddingHorizontal: 12,
  },
  addBtnDetail: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 20,
    paddingVertical: 10,
    ...Shadows.card,
  },
  addBtnTextDetail: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textOnPrimary,
  },
  detailReviewsTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  reviewItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 10,
    ...Shadows.subtle,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewerName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
  },
  reviewStarsMini: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewCommentText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 6,
  },
  reviewDate: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 9.5,
    color: Colors.textMuted,
  },
  noReviewsPrompt: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  // New styles for configurations
  detailOverlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  detailPriceUnit: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  dynamicRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: Radius.md,
    marginVertical: 14,
    borderColor: '#F59E0B',
    borderWidth: 1,
  },
  dynamicRateLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: '#D97706',
  },
  dynamicRateVal: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: Typography.fontSize.md,
    color: '#D97706',
  },
  detailActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 10,
  },
  addToCartBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  addToCartBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  buyNowBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  buyNowBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textOnPrimary,
  },
  hostelChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  hostelChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  hostelChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  hostelChipText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  hostelChipTextActive: {
    color: Colors.primary,
  },
  addressMapSection: {
    height: 180,
    width: '100%',
    backgroundColor: '#E2E8F0',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  addonsSectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  addonsList: {
    marginBottom: 12,
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  addonRowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  addonLabel: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  addonPrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
  },
  customOverlayBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    justifyContent: 'flex-end',
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  customSheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.md,
    maxHeight: '80%',
    ...Shadows.card,
  },
  customSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  customSheetTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  customSheetSubPrice: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    marginTop: 2,
  },
  customCloseBtn: {
    padding: 8,
  },
  customSheetScroll: {
    marginVertical: Spacing.sm,
  },
  customItemDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  customAddonsSection: {
    marginTop: Spacing.xs,
  },
  customSectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  customSectionSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  customAddonsList: {
    gap: Spacing.xs,
  },
  customAddonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
  },
  customAddonRowActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255, 69, 0, 0.05)',
  },
  customCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  customCheckboxActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  customCheckmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  customAddonLabel: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  customAddonPrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
  customQtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  customQtyLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  customQtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    padding: 3,
  },
  customSheetFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
  },
  customPriceBlock: {
    flexDirection: 'column',
  },
  customPriceLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  customPriceValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: '#1E293B',
  },
  customAddToCartBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.button,
  },
  customAddToCartBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: '#FFFFFF',
  },
  detailCheckoutDrawer: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    zIndex: 250,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 69, 0, 0.25)',
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  detailCartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  detailCartSummaryText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#1E293B',
  },
  detailCartItemsCount: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  detailProceedCheckoutBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  detailProceedCheckoutBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  // ── Menu Search Row (matches outer search bar exactly) ──
  menuSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  // ── Filter Funnel Button ──
  filterFunnelBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginLeft: 4,
  },
  filterFunnelBtnActive: {
    backgroundColor: 'rgba(255,69,0,0.08)',
    borderColor: Colors.primary,
  },
  filterActiveDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },

  // ── Filter Dropdown Box ──
  filterDropdownBox: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  filterDropdownTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  filterDropdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOptionCard: {
    width: '47%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  filterOptionCardActive: {
    backgroundColor: 'rgba(255,69,0,0.06)',
    borderColor: Colors.primary,
  },
  filterOptionLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
  },
  filterOptionLabelActive: {
    color: Colors.primary,
  },
  filterOptionSub: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
    marginTop: 2,
  },
});
