import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Truck,
  Users,
  MessageSquare,
  Search,
  DollarSign,
  AlertCircle,
  Utensils,
  Layers,
  TrendingUp,
  RefreshCw,
  MapPin,
  Send,
  Sparkles,
  Sun,
  Moon,
  Trash2,
  ChefHat,
  Activity
} from 'lucide-react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { api } from './lib/api';
import { socket } from './lib/socket';
import './App.css';

// Mock data for Offline Demo Mode fallbacks
const MOCK_PROFILES = [
  { id: 'u1', name: 'Rahul Student', email: 'student@tiffin.com', phone: '9876543210', plan: 'standard', walletBalance: 1500, streak: 5, address_hostel: 'BH-3', address_room: '204' }
];

const MOCK_ORDERS: any[] = [];

const MOCK_FEED = [
  { id: 'f1', user_name: 'Arjun S.', hostel_name: 'BH-3', rating: 5, comment: 'Rajma was absolutely perfect today! Just like home. Dal was a bit salty though 😅', created_at: new Date().toISOString() },
  { id: 'f2', user_name: 'Priya M.', hostel_name: 'GH-1', rating: 4, comment: 'Roti was soft and fresh! Delivery was on time too. Overall great experience 🙌', created_at: new Date().toISOString() },
  { id: 'f3', user_name: 'Rohit K.', hostel_name: 'BH-5', rating: 2, comment: 'Salty dal and very small portion of sabji today. Disappointed.', created_at: new Date().toISOString() }
];

const MOCK_TRANSACTIONS: any[] = [];

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, prefix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }

    const totalDuration = 800; // ms
    const incrementTime = 30; // ms
    const totalSteps = Math.ceil(totalDuration / incrementTime);
    const stepValue = end / totalSteps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= totalSteps) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(stepValue * currentStep));
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{count.toLocaleString()}</span>;
};

function DashboardApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [chartActive, setChartActive] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setChartActive(true), 250);
    return () => clearTimeout(timer);
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const activeTab = location.pathname.replace('/', '') || 'dashboard';
  const [roleMode, setRoleMode] = useState<'owner' | 'kitchen' | 'support'>((localStorage.getItem('admin_role_mode') as any) || 'owner');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle role changing with immediate route validation redirects
  const handleRoleChange = (newRole: 'owner' | 'kitchen' | 'support') => {
    setRoleMode(newRole);
    localStorage.setItem('admin_role_mode', newRole);
    const currentPath = location.pathname;
    if (newRole === 'kitchen') {
      const allowed = ['/dashboard', '/fleet', '/menu'];
      if (!allowed.includes(currentPath)) {
        navigate('/dashboard', { replace: true });
      }
    } else if (newRole === 'support') {
      const allowed = ['/crm', '/reviews'];
      if (!allowed.includes(currentPath)) {
        navigate('/crm', { replace: true });
      }
    }
  };

  // Route protection and redirection middleware
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const path = location.pathname;

    if (!token) {
      if (path !== '/login') {
        navigate('/login', { replace: true });
      }
    } else {
      if (path === '/login' || path === '/') {
        if (roleMode === 'support') {
          navigate('/crm', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        // Enforce RBAC & check if route is valid
        const allRoutes = ['/dashboard', '/fleet', '/menu', '/crm', '/finance', '/reviews', '/restaurant-menu', '/logs', '/riders-mgmt'];
        if (!allRoutes.includes(path)) {
          // Invalid path -> redirect to role default
          navigate(roleMode === 'support' ? '/crm' : '/dashboard', { replace: true });
          return;
        }

        if (roleMode === 'kitchen') {
          const allowed = ['/dashboard', '/fleet', '/menu', '/restaurant-menu', '/riders-mgmt'];
          if (!allowed.includes(path)) {
            navigate('/dashboard', { replace: true });
          }
        } else if (roleMode === 'support') {
          const allowed = ['/crm', '/reviews'];
          if (!allowed.includes(path)) {
            navigate('/crm', { replace: true });
          }
        }
      }
    }
  }, [isAuthenticated, roleMode, location.pathname]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  // Database state
  const [profiles, setProfiles] = useState<any[]>(MOCK_PROFILES);
  const [orders, setOrders] = useState<any[]>(MOCK_ORDERS);
  const [allOrders, setAllOrders] = useState<any[]>(MOCK_ORDERS);
  const [feed, setFeed] = useState<any[]>(MOCK_FEED);
  const [transactions, setTransactions] = useState<any[]>(MOCK_TRANSACTIONS);
  const [vacationRequests, setVacationRequests] = useState<any[]>([]);
  const [mealRatings, setMealRatings] = useState<any[]>([]);
  const [mealRatingsAvg, setMealRatingsAvg] = useState<number>(0);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'auth' | 'orders' | 'finance' | 'other'>('all');
  const [weeklyMenu, setWeeklyMenu] = useState<any[]>([
    { id: 1, day_name: 'Monday', main_dish: 'Dal + Sabji', side_dish: 'Roti, Rice', emoji: '🍲', calories: '~520 kcal' },
    { id: 2, day_name: 'Tuesday', main_dish: 'Rajma + Aloo', side_dish: 'Roti, Rice', emoji: '🫘', calories: '~580 kcal' },
    { id: 3, day_name: 'Wednesday', main_dish: 'Chole + Paneer Masala', side_dish: 'Roti, Rice', emoji: '🍛', calories: '~610 kcal' },
    { id: 4, day_name: 'Thursday', main_dish: 'Ghar-Made Masala', side_dish: 'Roti, Rice', emoji: '🌶️', calories: '~550 kcal' },
    { id: 5, day_name: 'Friday', main_dish: 'Palak + Packed Soups', side_dish: 'Roti, Rice', emoji: '🥬', calories: '~490 kcal' },
    { id: 6, day_name: 'Saturday', main_dish: 'Special Meal', side_dish: 'Roti, Rice + Meetha', emoji: '⭐', calories: '~650 kcal' },
    { id: 7, day_name: 'Sunday', main_dish: 'Holiday', side_dish: 'No Service', emoji: '🛌', calories: '0 kcal' }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubscribersModal, setShowSubscribersModal] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(new Date().toLocaleTimeString());
  const [restaurants, setRestaurants] = useState<any[]>([]);

  // Restaurant Menu Item Modal States
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemModalMode, setItemModalMode] = useState<'add' | 'edit'>('add');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [editingItemId, setEditingItemId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemOriginalPrice, setItemOriginalPrice] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemImage, setItemImage] = useState('');
  const [itemIsVeg, setItemIsVeg] = useState(true);
  const [itemIsAvailable, setItemIsAvailable] = useState(true);
  const [itemCategory, setItemCategory] = useState('');
  const [customCategories, setCustomCategories] = useState<Record<string, string[]>>({});
  const [isCategoryLocked, setIsCategoryLocked] = useState(false);
  
  // Restaurant entity states
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [newRestName, setNewRestName] = useState('');
  const [newRestCuisine, setNewRestCuisine] = useState('');
  const [newRestDeliveryTime, setNewRestDeliveryTime] = useState('20-30 mins');
  const [newRestImage, setNewRestImage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Refund modal state
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState('100');
  const [refundReason, setRefundReason] = useState('Poor Food Quality');

  // Live fleet simulator state
  const [dispatchedOrderId, setDispatchedOrderId] = useState<string | null>(null);
  const [riderPosition, setRiderPosition] = useState({ x: 30, y: 180 }); // Start coordinates (Central Kitchen)
  const [deliveryProgress, setDeliveryProgress] = useState(0);
  const [liveRiders, setLiveRiders] = useState<Record<string, any>>({});
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [expandedLedgerUsers, setExpandedLedgerUsers] = useState<Record<string, boolean>>({});

  // Tiffin orders bulk generation state
  const [isGeneratingTiffins, setIsGeneratingTiffins] = useState(false);
  // Real-time order notification state
  const [newOrderNotification, setNewOrderNotification] = useState<{ id: string, name: string, amount: number, time: string } | null>(null);

  const handleGenerateTiffins = async () => {
    if (!window.confirm("Do you want to generate active tiffin delivery orders for all active subscribers for today?")) return;
    setIsGeneratingTiffins(true);
    try {
      const { data } = await api.post('/admin/tiffins/generate');
      if (data.success) {
        alert(data.message);
        loadAllData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate tiffins');
    } finally {
      setIsGeneratingTiffins(false);
    }
  };

  // Poll manager state
  const [activePoll, setActivePoll] = useState<any>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionA, setPollOptionA] = useState('');
  const [pollOptionB, setPollOptionB] = useState('');

  // Sound Notification trigger (Double-tone beep for dashboard alert)
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      osc.start();
      
      setTimeout(() => {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      }, 150);
      
      setTimeout(() => {
        osc.stop();
        audioCtx.close();
      }, 350);
    } catch (e) {
      console.warn('Could not play notification sound:', e);
    }
  };

  const mapCoordsToSvg = (lat: number, lng: number) => {
    const baseLat = 28.6139;
    const baseLng = 77.2090;
    const scaleY = (lat - baseLat) / 0.007;
    const scaleX = (lng - baseLng) / 0.002;
    const x = Math.max(20, Math.min(340, 40 + scaleX * 240 + scaleY * 40));
    const y = Math.max(20, Math.min(300, 180 - scaleY * 120 + scaleX * 30));
    return { x, y };
  };

  const connectSocket = () => {
    socket.connect();
    socket.emit('join', { role: 'admin' });
    
    socket.on('new_order', (order: any) => {
      playNotificationSound();
      loadAllData();
      if (order && order.user) {
        setNewOrderNotification({
          id: order._id || order.id,
          name: order.user.name,
          amount: order.totalAmount,
          time: new Date(order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        
        // Auto-dismiss after 6 seconds
        setTimeout(() => {
          setNewOrderNotification(prev => prev?.id === (order._id || order.id) ? null : prev);
        }, 6000);
      }
    });

    socket.on('new_transaction', () => {
      playNotificationSound();
      loadAllData();
    });

    socket.on('order_status_updated', () => {
      loadAllData();
    });

    // 🏖️ Live vacation request from student
    socket.on('vacation_requested', (data: any) => {
      playNotificationSound();
      setVacationRequests(prev => [{ ...data, status: 'pending' }, ...prev]);
    });

    // ❌ Student cancelled their own vacation
    socket.on('vacation_cancelled', (data: any) => {
      setVacationRequests(prev =>
        prev.map(v =>
          v.requestId?.toString() === data.requestId?.toString()
            ? { ...v, status: 'cancelled' }
            : v
        )
      );
    });

    // ⭐ Student rated today's meal
    socket.on('meal_rated', (data: any) => {
      setMealRatings(prev => {
        const exists = prev.findIndex(r => (r.userId || r.user)?.toString() === (data.userId || data.user)?.toString() && r.date === data.date);
        let updated;
        if (exists >= 0) {
          updated = [...prev];
          updated[exists] = data;
        } else {
          updated = [data, ...prev];
        }
        const avg = updated.reduce((s: number, r: any) => s + r.rating, 0) / updated.length;
        setMealRatingsAvg(parseFloat(avg.toFixed(1)));
        return updated;
      });
    });

    socket.on('all_rider_locations', (data: any) => {
      setLiveRiders(prev => ({
        ...prev,
        [data.riderId]: {
          riderId: data.riderId,
          riderName: data.riderName,
          riderVehicle: data.riderVehicle || '',
          orderId: data.orderId,
          latitude: data.latitude,
          longitude: data.longitude,
          updatedAt: Date.now()
        }
      }));
    });

    socket.on('poll_updated', (data: any) => {
      setActivePoll((prev: any) => {
        if (prev && String(prev.id || prev._id) === String(data.id || data._id)) {
          return {
            ...prev,
            votes_a: data.votes_a,
            votes_b: data.votes_b,
            totalVotes: data.totalVotes
          };
        }
        return prev;
      });
    });

    socket.on('new_poll_created', (data: any) => {
      setActivePoll(data);
    });

    socket.on('new_activity_log', (data: any) => {
      setActivityLogs(prev => [data, ...prev].slice(0, 100));
    });
  };

  const disconnectSocket = () => {
    socket.off('new_order');
    socket.off('new_transaction');
    socket.off('order_status_updated');
    socket.off('vacation_requested');
    socket.off('vacation_cancelled');
    socket.off('meal_rated');
    socket.off('all_rider_locations');
    socket.off('poll_updated');
    socket.off('new_poll_created');
    socket.off('new_activity_log');
    socket.disconnect();
  };

  // Check auth and setup sockets on load
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
      loadAllData();
      connectSocket();
    }
    return () => {
      disconnectSocket();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: loginEmail,
        password: loginPassword
      });
      
      if (response.data && response.data.success) {
        const { token, user } = response.data;
        if (user.role !== 'admin') {
          setLoginError('Access denied: Only users with admin role can access this panel.');
          setIsLoading(false);
          return;
        }
        localStorage.setItem('admin_token', token);
        setCurrentUser(user);
        setIsAuthenticated(true);
        connectSocket();
        await loadAllData();
      } else {
        setLoginError('Invalid email or password');
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.message || 'Login failed. Verify backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setCurrentUser(null);
    disconnectSocket();
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Orders
      const ordersResponse = await api.get('/orders');
      if (ordersResponse.data && ordersResponse.data.success) {
        const allOrdersData = ordersResponse.data.data;
        setAllOrders(allOrdersData);
        
        // Filter today's orders in local time or any active orders that are not yet delivered/cancelled
        const todayStr = new Date().toLocaleDateString('en-CA');
        const activeOrTodayOrders = allOrdersData.filter((o: any) => {
          const orderDate = new Date(o.createdAt).toLocaleDateString('en-CA');
          const isToday = orderDate === todayStr;
          const isActive = o.status !== 'delivered' && o.status !== 'cancelled';
          return isToday || isActive;
        });
        setOrders(activeOrTodayOrders);
      }

      // 2. Fetch Users (Profiles)
      const usersResponse = await api.get('/admin/users');
      if (usersResponse.data && usersResponse.data.success) {
        setProfiles(usersResponse.data.data);
      }

      // 3. Fetch Transactions
      const txResponse = await api.get('/admin/transactions');
      if (txResponse.data && txResponse.data.success) {
        const mappedTx = txResponse.data.data.map((tx: any) => ({
          id: tx._id,
          user_id: tx.user?._id || tx.user,
          profiles: {
            name: tx.user?.name || 'Student User',
            phone: tx.user?.phone || 'N/A'
          },
          amount: tx.amount,
          type: tx.type,
          description: tx.description,
          status: tx.status,
          utr: tx.utr,
          created_at: tx.createdAt
        }));
        setTransactions(mappedTx);
      }

      // 4. Fetch Weekly Menu
      const menuResponse = await api.get('/menu/weekly');
      if (menuResponse.data && menuResponse.data.success) {
        const mappedMenu = menuResponse.data.data.map((d: any) => ({
          id: d._id,
          day_name: d.dayName,
          main_dish: d.mainDish,
          side_dish: d.sideDish,
          emoji: d.emoji,
          calories: d.calories || '~550 kcal'
        }));
        setWeeklyMenu(mappedMenu);
      }

      // 5. Fetch Vacation Requests
      try {
        const vacRes = await api.get('/admin/vacations');
        if (vacRes.data && vacRes.data.success) {
          setVacationRequests(vacRes.data.data);
        }
      } catch (e) { /* non-critical */ }

      // 6. Fetch Meal Ratings (today)
      try {
        const today = new Date().toISOString().split('T')[0];
        const ratingsRes = await api.get(`/admin/ratings?date=${today}`);
        if (ratingsRes.data && ratingsRes.data.success) {
          setMealRatings(ratingsRes.data.data);
          setMealRatingsAvg(ratingsRes.data.avgRating || 0);
        }
      } catch (e) { /* non-critical */ }

      // 7. Fetch Restaurants
      try {
        const restRes = await api.get('/restaurants');
        if (restRes.data && restRes.data.success) {
          const fetchedRest = restRes.data.data;
          setRestaurants(fetchedRest);
          setCustomCategories(prev => {
            const next = { ...prev };
            fetchedRest.forEach((r: any) => {
              const items = r.menuItems || [];
              const itemCats = Array.from(new Set(items.map((i: any) => i.category || 'Popular Dishes'))) as string[];
              const existing = prev[r._id] || [];
              next[r._id] = Array.from(new Set([...existing, ...itemCats]));
            });
            return next;
          });
        }
      } catch (e) { /* non-critical */ }

      // 8. Fetch Activity Logs
      try {
        const logsRes = await api.get('/admin/activity-logs');
        if (logsRes.data && logsRes.data.success) {
          setActivityLogs(logsRes.data.data);
        }
      } catch (e) { /* non-critical */ }

      // 9. Fetch Active Poll
      try {
        const pollRes = await api.get('/polls/active');
        if (pollRes.data && pollRes.data.success) {
          setActivePoll(pollRes.data.data);
        }
      } catch (e) { /* non-critical */ }

      setFeed(MOCK_FEED);
      setLastUpdatedTime(new Date().toLocaleTimeString());

    } catch (e: any) {
      console.error('Error loading API data:', e);
      if (e.response && (e.response.status === 401 || e.response.status === 404)) {
        console.warn('Unauthorized or User not found (stale token). Logging out...');
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Kitchen forecasting calculations based on active student subscription profiles
  const basicCount = profiles.filter(p => p.role === 'student' && p.plan === 'basic').length;
  const standardCount = profiles.filter(p => p.role === 'student' && p.plan === 'standard').length;
  const premiumCount = profiles.filter(p => p.role === 'student' && p.plan === 'premium').length;
  const totalMealCount = basicCount + standardCount + premiumCount;

  // Addons calculations directly from order items
  const todayItems = orders.flatMap(o => o.items || []);
  const extraRotiCount = todayItems.filter((i: any) => i.name?.toLowerCase().includes('roti')).reduce((acc, curr) => acc + curr.quantity, 0);
  const curdCount = todayItems.filter((i: any) => i.name?.toLowerCase().includes('curd')).reduce((acc, curr) => acc + curr.quantity, 0);
  const saladCount = todayItems.filter((i: any) => i.name?.toLowerCase().includes('salad')).reduce((acc, curr) => acc + curr.quantity, 0);
  const jamunCount = todayItems.filter((i: any) => i.name?.toLowerCase().includes('jamun') || i.name?.toLowerCase().includes('sweet')).reduce((acc, curr) => acc + curr.quantity, 0);

  const todayAddonRevenue = (extraRotiCount * 15) + (curdCount * 20) + (saladCount * 15) + (jamunCount * 25);
  const todayAddonOrdersCount = orders.filter(o =>
    o.items?.some((i: any) =>
      i.name?.toLowerCase().includes('roti') ||
      i.name?.toLowerCase().includes('curd') ||
      i.name?.toLowerCase().includes('salad') ||
      i.name?.toLowerCase().includes('jamun') ||
      i.name?.toLowerCase().includes('sweet')
    )
  ).length;

  const rawAtta = (basicCount * 0.15 + standardCount * 0.2 + premiumCount * 0.25 + extraRotiCount * 0.05).toFixed(1);
  const rawRice = (basicCount * 0.1 + standardCount * 0.15 + premiumCount * 0.2).toFixed(1);
  const rawPaneer = ((standardCount + premiumCount) * 0.1).toFixed(1); // kg

  // Finance & revenue calculations
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const todayRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  // All-time delivered revenue
  const allTimeDeliveredOrders = allOrders.filter(o => o.status === 'delivered');
  const allTimeRevenue = allTimeDeliveredOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  // Total cash received today from approved recharges
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCashInflow = transactions.reduce((sum, t) => {
    const isToday = t.created_at && t.created_at.split('T')[0] === todayStr;
    if (isToday && t.type === 'recharge' && t.status === 'approved') {
      return sum + Number(t.amount);
    }
    return sum;
  }, 0);

  // Total cash received all-time from approved recharges
  const allTimeCashInflow = transactions.reduce((sum, t) => {
    if (t.type === 'recharge' && t.status === 'approved') {
      return sum + Number(t.amount);
    }
    return sum;
  }, 0);

  // Get aggregated data for the last 7 days
  const getRevenueForLast7Days = () => {
    const dates = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    return dates.map(dateStr => {
      // Find orders delivered on this date
      const dayOrders = allOrders.filter(o => {
        const orderDate = new Date(o.createdAt || o.delivery_date).toISOString().split('T')[0];
        return orderDate === dateStr && o.status === 'delivered';
      });
      const dayRevenue = dayOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

      // Find approved recharges on this date
      const dayRecharges = transactions.filter(t => t.type === 'recharge' && t.status === 'approved' && t.created_at && t.created_at.split('T')[0] === dateStr).reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        dateStr,
        dateLabel: new Date(dateStr).toLocaleDateString([], { weekday: 'short', day: 'numeric' }),
        revenue: dayRevenue,
        recharges: dayRecharges
      };
    });
  };

  // Handle 1-Click Refund / Credit
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const amount = Number(refundAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsLoading(true);
    try {
      const response = await api.put(`/admin/users/${selectedUser._id || selectedUser.id}/wallet`, {
        amount: amount,
        type: 'refund',
        description: `Admin Credit: ${refundReason}`
      });

      if (response.data && response.data.success) {
        alert(`Successfully refunded ₹${amount} to ${selectedUser.name}!`);
        await loadAllData();
        setSelectedUser(null);
      } else {
        alert('Failed to issue refund.');
      }
    } catch (err: any) {
      alert(`Refund failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new poll deployment
  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim() || !pollOptionA.trim() || !pollOptionB.trim()) {
      alert('All fields are required.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post('/admin/polls', {
        question: pollQuestion.trim(),
        option_a: pollOptionA.trim(),
        option_b: pollOptionB.trim()
      });
      if (response.data && response.data.success) {
        alert('New poll deployed successfully & broadcasted to all students in real-time!');
        setActivePoll(response.data.data);
        setPollQuestion('');
        setPollOptionA('');
        setPollOptionB('');
      } else {
        alert('Failed to deploy new poll.');
      }
    } catch (err: any) {
      alert(`Error creating poll: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle UPI Recharge Approvals
  const handleApproveTransaction = async (tx: any) => {
    setIsLoading(true);
    try {
      const response = await api.put(`/admin/transactions/${tx.id || tx._id}/status`, { status: 'approved' });
      if (response.data && response.data.success) {
        alert(`Payment approved & ₹${tx.amount} credited successfully!`);
        await loadAllData();
      } else {
        alert('Failed to approve transaction.');
      }
    } catch (err: any) {
      alert(`Approval failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectTransaction = async (tx: any) => {
    setIsLoading(true);
    try {
      const response = await api.put(`/admin/transactions/${tx.id || tx._id}/status`, { status: 'rejected' });
      if (response.data && response.data.success) {
        alert('Transaction rejected successfully!');
        await loadAllData();
      } else {
        alert('Failed to reject transaction.');
      }
    } catch (err: any) {
      alert(`Rejection failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Menu Handlers
  const handleMenuChange = (id: number | string, field: string, value: string) => {
    setWeeklyMenu(prev => prev.map(d => (d.id === id || d._id === id) ? { ...d, [field]: value } : d));
  };

  const saveMenuDay = async (day: any) => {
    setIsLoading(true);
    try {
      const response = await api.put(`/menu/weekly/${day.id || day._id}`, {
        mainDish: day.main_dish,
        sideDish: day.side_dish,
        emoji: day.emoji
      });

      if (response.data && response.data.success) {
        alert(`${day.day_name} menu updated successfully!`);
        await loadAllData();
      } else {
        alert('Failed to update menu.');
      }
    } catch (err: any) {
      alert(`Error updating menu: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemAvailability = async (restaurantId: string, itemId: string, currentStatus: boolean) => {
    setIsLoading(true);
    try {
      const response = await api.put(`/restaurants/${restaurantId}/items/${itemId}/availability`, {
        isAvailable: !currentStatus
      });
      if (response.data && response.data.success) {
        setRestaurants(prev => prev.map(r => {
          if (r._id === restaurantId) {
            return {
              ...r,
              menuItems: r.menuItems.map((item: any) => {
                if (item._id === itemId) {
                  return { ...item, isAvailable: !currentStatus };
                }
                return item;
              })
            };
          }
          return r;
        }));
      } else {
        alert('Failed to toggle availability.');
      }
    } catch (err: any) {
      alert(`Error updating item availability: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddItemModal = (restaurantId: string, prefilledCategory?: string) => {
    setSelectedRestaurantId(restaurantId);
    setItemModalMode('add');
    setEditingItemId('');
    setItemName('');
    setItemPrice('');
    setItemOriginalPrice('');
    setItemDesc('');
    setItemImage('');
    setItemIsVeg(true);
    setItemIsAvailable(true);
    setItemCategory(prefilledCategory || '');
    setIsCategoryLocked(!!prefilledCategory);
    setShowItemModal(true);
  };

  const openEditItemModal = (restaurantId: string, item: any) => {
    setSelectedRestaurantId(restaurantId);
    setItemModalMode('edit');
    setEditingItemId(item._id || item.id);
    setItemName(item.name);
    setItemPrice(item.price.toString());
    setItemOriginalPrice(item.originalPrice ? item.originalPrice.toString() : '');
    setItemDesc(item.description || '');
    setItemImage(item.image || '');
    setItemIsVeg(item.isVeg !== false);
    setItemIsAvailable(item.isAvailable !== false);
    setItemCategory(item.category || '');
    setIsCategoryLocked(false);
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemPrice) {
      alert('Dish Name and Price are required.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: itemName,
        description: itemDesc,
        price: Number(itemPrice),
        originalPrice: itemOriginalPrice ? Number(itemOriginalPrice) : null,
        image: itemImage,
        isVeg: itemIsVeg,
        isAvailable: itemIsAvailable,
        category: itemCategory.trim() || 'Popular Dishes'
      };

      let response;
      if (itemModalMode === 'add') {
        response = await api.post(`/restaurants/${selectedRestaurantId}/items`, payload);
      } else {
        response = await api.put(`/restaurants/${selectedRestaurantId}/items/${editingItemId}`, payload);
      }

      if (response.data && response.data.success) {
        alert(itemModalMode === 'add' ? 'Dish added successfully!' : 'Dish updated successfully!');
        setShowItemModal(false);
        await loadAllData();
      } else {
        alert('Failed to save dish.');
      }
    } catch (err: any) {
      alert(`Error saving dish: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (restaurantId: string, itemId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.delete(`/restaurants/${restaurantId}/items/${itemId}`);
      if (response.data && response.data.success) {
        alert('Dish deleted successfully!');
        await loadAllData();
      } else {
        alert('Failed to delete dish.');
      }
    } catch (err: any) {
      alert(`Error deleting dish: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestName || !newRestCuisine) {
      alert('Restaurant Name and Cuisine are required.');
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        name: newRestName.trim(),
        cuisine: newRestCuisine.trim(),
        deliveryTime: newRestDeliveryTime.trim() || '20-30 mins',
        image: newRestImage.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
      };
      const response = await api.post('/restaurants', payload);
      if (response.data && response.data.success) {
        alert('Section created successfully!');
        setShowRestaurantModal(false);
        setNewRestName('');
        setNewRestCuisine('');
        setNewRestDeliveryTime('20-30 mins');
        setNewRestImage('');
        await loadAllData();
      } else {
        alert('Failed to create section.');
      }
    } catch (err: any) {
      alert(`Error creating section: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRestaurant = async (restaurantId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the entire section "${name}" and all its menu items? This action cannot be undone.`)) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.delete(`/restaurants/${restaurantId}`);
      if (response.data && response.data.success) {
        alert('Section deleted successfully!');
        await loadAllData();
      } else {
        alert('Failed to delete section.');
      }
    } catch (err: any) {
      alert(`Error deleting section: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File, onUploadSuccess: (url: string) => void) => {
    if (!file) return;
    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (response.data && response.data.success) {
        onUploadSuccess(response.data.url);
        alert('Image uploaded successfully!');
      } else {
        alert('Failed to upload image.');
      }
    } catch (err: any) {
      console.error('Image upload error:', err);
      alert(`Error uploading image: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Start animated GPS Map Simulator
  const handleDispatch = async (order: any) => {
    if (dispatchedOrderId) return;
    setDispatchedOrderId(order._id || order.id);
    setDeliveryProgress(0);

    const updateStatus = async (status: string) => {
      try {
        await api.put(`/orders/${order._id || order.id}/status`, { status });
      } catch (err) {
        console.error('Error updating order status:', err);
      }
    };

    await updateStatus('out_for_delivery');

    // Simulate movement coordinates
    const hostelVal = order.user?.addressLine || order.user?.addressHostel || order.user?.address_hostel || '';
    const targetX = (hostelVal.includes('GH-2') || hostelVal.includes('Girls')) ? 320 : 280;
    const targetY = (hostelVal.includes('GH-2') || hostelVal.includes('Girls')) ? 240 : 100;

    let progress = 0;
    const interval = setInterval(async () => {
      progress += 10;
      setDeliveryProgress(progress);

      const currentX = 30 + ((targetX - 30) * progress) / 100;
      const currentY = 180 + ((targetY - 180) * progress) / 100;
      setRiderPosition({ x: currentX, y: currentY });

      // Emit rider location updates to the socket server
      socket.emit('update_rider_location', {
        orderId: order._id || order.id,
        latitude: currentX,
        longitude: currentY
      });

      if (progress >= 100) {
        clearInterval(interval);
        // Let the rider confirm the delivery in the Rider App instead of auto-completing
        // await updateStatus('delivered');
        setTimeout(() => {
          setDispatchedOrderId(null);
          setDeliveryProgress(0);
          setRiderPosition({ x: 30, y: 180 });
          loadAllData();
        }, 1500);
      }
    }, 400);
  };

  // CRM Search Filter
  const filteredStudents = profiles.filter(
    p =>
      (p.role === 'student' || !p.role) &&
      (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone?.includes(searchQuery))
  );

  const filteredRiders = profiles.filter(
    p =>
      p.role === 'rider' &&
      (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone?.includes(searchQuery))
  );

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh', 
            backgroundColor: '#0f172a', // dark premium background
            color: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            <div style={{ 
              width: '100%', 
              maxWidth: '420px', 
              backgroundColor: '#1e293b', 
              border: '1px solid #334155', 
              borderRadius: '16px', 
              padding: '40px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '48px' }}>🍱</span>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316', margin: 0 }}>Student Tiffin</h2>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>Admin Portal Dashboard</p>
              </div>

              {loginError ? (
                <div style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                  color: '#ef4444', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  fontSize: '13px', 
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontWeight: 500
                }}>
                  ⚠️ {loginError}
                </div>
              ) : null}

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Email Address</label>
                  <input 
                    type="email" 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@tiffin.com"
                    style={{ 
                      backgroundColor: '#0f172a', 
                      border: '1px solid #334155', 
                      color: '#f8fafc', 
                      padding: '12px 14px', 
                      borderRadius: '8px', 
                      fontSize: '14px', 
                      outline: 'none'
                    }}
                    required 
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Password</label>
                  <input 
                    type="password" 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ 
                      backgroundColor: '#0f172a', 
                      border: '1px solid #334155', 
                      color: '#f8fafc', 
                      padding: '12px 14px', 
                      borderRadius: '8px', 
                      fontSize: '14px', 
                      outline: 'none'
                    }}
                    required 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  style={{ 
                    backgroundColor: '#f97316', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '8px', 
                    padding: '14px', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    opacity: isLoading ? 0.7 : 1
                  }}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      
      {/* Real-time New Order Notification Banner */}
      {newOrderNotification && (
        <div style={{
          position: 'fixed',
          top: '90px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: 'var(--bg-secondary)',
          border: '2px solid #f97316',
          borderRadius: '16px',
          padding: '20px',
          width: '320px',
          boxShadow: '0 10px 25px rgba(249,115,22,0.2)',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
          animation: 'slideIn 0.3s ease-out',
        }}>
          <div style={{ fontSize: '28px', animation: 'ring 1.5s ease infinite' }}>🔔</div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>New Order Received! 🚀</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              From: <span style={{ fontWeight: 600 }}>{newOrderNotification.name}</span>
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Amount: <span style={{ fontWeight: 600, color: '#10b981' }}>₹{newOrderNotification.amount}</span>
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              Received at {newOrderNotification.time}
            </p>
          </div>
          <button 
            onClick={() => setNewOrderNotification(null)}
            style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer', padding: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Navbar System (Replaces sidebar entirely for perfect responsiveness) */}
      <header style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        borderBottom: '1px solid var(--border)', 
        padding: '16px 24px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        {/* Top row: brand, live indicator, and user buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '32px' }}>🍱</span>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)', margin: 0, letterSpacing: '0.5px' }}>Student Tiffin Hub</h1>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                {currentUser ? `${currentUser.name} (${currentUser.role})` : 'Host Dashboard'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Live Indicator */}
            <div style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
              Live Sync
            </div>

            {/* Daily Tiffin Orders Generator (Admin Dispatch Activator) */}
            {roleMode !== 'support' && (
              <button
                onClick={handleGenerateTiffins}
                disabled={isGeneratingTiffins}
                style={{
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isGeneratingTiffins ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: isGeneratingTiffins ? 0.7 : 1
                }}
              >
                🍳 {isGeneratingTiffins ? 'Starting Tiffins...' : 'Start Today\'s Tiffins'}
              </button>
            )}

            {/* Access Role Switcher */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-tertiary)', padding: '4px', borderRadius: '8px' }}>
              <button 
                onClick={() => handleRoleChange('owner')} 
                style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer', border: 'none', backgroundColor: roleMode === 'owner' ? '#f97316' : 'transparent', color: roleMode === 'owner' ? '#fff' : 'var(--text-secondary)', fontWeight: 600 }}
              >Owner</button>
              <button 
                onClick={() => handleRoleChange('kitchen')} 
                style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer', border: 'none', backgroundColor: roleMode === 'kitchen' ? '#f97316' : 'transparent', color: roleMode === 'kitchen' ? '#fff' : 'var(--text-secondary)', fontWeight: 600 }}
              >Kitchen</button>
              <button 
                onClick={() => handleRoleChange('support')} 
                style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer', border: 'none', backgroundColor: roleMode === 'support' ? '#f97316' : 'transparent', color: roleMode === 'support' ? '#fff' : 'var(--text-secondary)', fontWeight: 600 }}
              >Support</button>
            </div>

            {/* Icons row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={loadAllData} title="Refresh Data" style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
              <button onClick={toggleTheme} title="Toggle Theme" style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                🚪 Log Out
              </button>
            </div>
          </div>
        </div>

        {/* Bottom row: Tab buttons (Horizontally scrollable on mobile) */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          overflowX: 'auto', 
          paddingBottom: '4px',
          WebkitOverflowScrolling: 'touch'
        }}>
          {roleMode !== 'support' && (
            <button
              onClick={() => navigate('/dashboard')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none', backgroundColor: activeTab === 'dashboard' ? 'rgba(249,115,22,0.1)' : 'transparent', color: activeTab === 'dashboard' ? '#f97316' : 'var(--text-secondary)', fontWeight: activeTab === 'dashboard' ? 600 : 500 }}
            >
              <LayoutDashboard size={16} />
              <span>Kitchen & Overview</span>
            </button>
          )}

          {roleMode !== 'support' && (
            <button
              onClick={() => navigate('/fleet')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none', backgroundColor: activeTab === 'fleet' ? 'rgba(249,115,22,0.1)' : 'transparent', color: activeTab === 'fleet' ? '#f97316' : 'var(--text-secondary)', fontWeight: activeTab === 'fleet' ? 600 : 500 }}
            >
              <Truck size={16} />
              <span>Fleet Tracking Map</span>
            </button>
          )}

          {roleMode !== 'support' && (
            <button
              onClick={() => navigate('/menu')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none', backgroundColor: activeTab === 'menu' ? 'rgba(249,115,22,0.1)' : 'transparent', color: activeTab === 'menu' ? '#f97316' : 'var(--text-secondary)', fontWeight: activeTab === 'menu' ? 600 : 500 }}
            >
              <Utensils size={16} />
              <span>Menu Management</span>
            </button>
          )}

          {roleMode !== 'support' && (
            <button
              onClick={() => navigate('/restaurant-menu')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none', backgroundColor: activeTab === 'restaurant-menu' ? 'rgba(249,115,22,0.1)' : 'transparent', color: activeTab === 'restaurant-menu' ? '#f97316' : 'var(--text-secondary)', fontWeight: activeTab === 'restaurant-menu' ? 600 : 500 }}
            >
              <ChefHat size={16} />
              <span>Restaurant Menu</span>
            </button>
          )}

          {roleMode !== 'support' && (
            <button
              onClick={() => navigate('/riders-mgmt')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none', backgroundColor: activeTab === 'riders-mgmt' ? 'rgba(249,115,22,0.1)' : 'transparent', color: activeTab === 'riders-mgmt' ? '#f97316' : 'var(--text-secondary)', fontWeight: activeTab === 'riders-mgmt' ? 600 : 500 }}
            >
              <Truck size={16} />
              <span>🛵 Riders Section</span>
            </button>
          )}

          {roleMode !== 'kitchen' && (
            <button
              onClick={() => navigate('/crm')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none', backgroundColor: activeTab === 'crm' ? 'rgba(249,115,22,0.1)' : 'transparent', color: activeTab === 'crm' ? '#f97316' : 'var(--text-secondary)', fontWeight: activeTab === 'crm' ? 600 : 500 }}
            >
              <Users size={16} />
              <span>CRM & Refunds</span>
            </button>
          )}

          {roleMode === 'owner' && (
            <button
              onClick={() => navigate('/finance')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none', backgroundColor: activeTab === 'finance' ? 'rgba(249,115,22,0.1)' : 'transparent', color: activeTab === 'finance' ? '#f97316' : 'var(--text-secondary)', fontWeight: activeTab === 'finance' ? 600 : 500 }}
            >
              <DollarSign size={16} />
              <span>Earnings & Finance</span>
            </button>
          )}

          {roleMode !== 'kitchen' && (
            <button
              onClick={() => navigate('/reviews')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none', backgroundColor: activeTab === 'reviews' ? 'rgba(249,115,22,0.1)' : 'transparent', color: activeTab === 'reviews' ? '#f97316' : 'var(--text-secondary)', fontWeight: activeTab === 'reviews' ? 600 : 500 }}
            >
              <MessageSquare size={16} />
              <span>Student Reviews</span>
            </button>
          )}

          {roleMode === 'owner' && (
            <button
              onClick={() => navigate('/logs')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none', backgroundColor: activeTab === 'logs' ? 'rgba(249,115,22,0.1)' : 'transparent', color: activeTab === 'logs' ? '#f97316' : 'var(--text-secondary)', fontWeight: activeTab === 'logs' ? 600 : 500 }}
            >
              <Activity size={16} />
              <span>System Activity Logs</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Panel Content Area */}
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header shimmer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="shimmer-block" style={{ width: '220px', height: '36px' }}></div>
              <div className="shimmer-block" style={{ width: '120px', height: '24px' }}></div>
            </div>
            
            {/* Upper Widgets shimmer */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="shimmer-block" style={{ width: '40%', height: '14px' }}></div>
                  <div className="shimmer-block" style={{ width: '80%', height: '36px' }}></div>
                  <div className="shimmer-block" style={{ width: '60%', height: '12px' }}></div>
                </div>
              ))}
            </div>

            {/* Middle Section shimmer */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="shimmer-block" style={{ width: '30%', height: '22px' }}></div>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="shimmer-block" style={{ width: '100%', height: '12px' }}></div>
                    <div className="shimmer-block" style={{ width: '100%', height: '8px' }}></div>
                  </div>
                ))}
              </div>
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="shimmer-block" style={{ width: '50%', height: '22px' }}></div>
                <div className="shimmer-block" style={{ width: '100%', height: '120px' }}></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* TAB 1: Kitchen View & Overview */}
        {activeTab === 'dashboard' && roleMode !== 'support' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Upper Widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {/* Card 1: Today's Revenue */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Today's Revenue (Delivered)</span>
                  <DollarSign size={18} style={{ color: '#10b981' }} />
                </div>
                <h3 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#10b981' }}>
                  <AnimatedCounter value={todayRevenue} prefix="₹" />
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  From {orders.filter(o => o.status === 'delivered').length} delivered meals + add-ons today
                </p>
              </div>

              {/* Card 2: Today's Cash Inflow */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Today's Cash Inflow (Recharges)</span>
                  <DollarSign size={18} style={{ color: '#f59e0b' }} />
                </div>
                <h3 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#f59e0b' }}>
                  <AnimatedCounter value={todayCashInflow} prefix="₹" />
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Total approved deposits today
                </p>
              </div>

              {/* Card 3: Active Subscriptions */}
              <div 
                onClick={() => setShowSubscribersModal(true)}
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid #3b82f6', borderRadius: '16px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#2563eb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#3b82f6'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Subscriptions</span>
                  <Layers size={18} style={{ color: '#3b82f6' }} />
                </div>
                <h3 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#3b82f6' }}>
                  <AnimatedCounter value={profiles.filter(p => p.plan !== 'none').length} /> / {profiles.length}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Students with active meal plans (click to see)
                </p>
              </div>

              {/* Card 4: All-Time Revenue */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>All-Time Revenue (Delivered)</span>
                  <DollarSign size={18} style={{ color: '#10b981' }} />
                </div>
                <h3 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#10b981' }}>
                  <AnimatedCounter value={allTimeRevenue} prefix="₹" />
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Total value of all delivered meals + add-ons ever
                </p>
              </div>

              {/* Card 5: All-Time Cash Collected */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>All-Time Cash Inflow (Recharges)</span>
                  <DollarSign size={18} style={{ color: '#f59e0b' }} />
                </div>
                <h3 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#f59e0b' }}>
                  <AnimatedCounter value={allTimeCashInflow} prefix="₹" />
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Total approved deposits ever
                </p>
              </div>

              {/* Card 6: Wallet Liability */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Wallet Balance Liability</span>
                  <DollarSign size={18} style={{ color: '#8b5cf6' }} />
                </div>
                <h3 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#8b5cf6' }}>
                  <AnimatedCounter value={profiles.reduce((sum, p) => sum + Number(p.wallet_balance || 0), 0)} prefix="₹" />
                </h3>
                <p style={{ fontSize: '12px', color: '#8b5cf6', marginTop: '4px', fontWeight: 500 }}>
                  Outstanding liability of student balances
                </p>
              </div>
            </div>

            {/* Smart Demand Forecasting & Inventory Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
              
              {/* Kitchen Plan Count & Forecast */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Utensils style={{ color: 'var(--primary)' }} /> Kitchen Preparation & Demand
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      <span>Basic Meal (₹70)</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{basicCount} orders</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div className="chart-bar-grow" style={{ height: '100%', width: `${chartActive && totalMealCount > 0 ? (basicCount / totalMealCount) * 100 : 0}%`, backgroundColor: '#3b82f6' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      <span>Standard Meal (₹90)</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{standardCount} orders</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div className="chart-bar-grow" style={{ height: '100%', width: `${chartActive && totalMealCount > 0 ? (standardCount / totalMealCount) * 100 : 0}%`, backgroundColor: '#f97316' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      <span>Premium Meal (₹130)</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{premiumCount} orders</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div className="chart-bar-grow" style={{ height: '100%', width: `${chartActive && totalMealCount > 0 ? (premiumCount / totalMealCount) * 100 : 0}%`, backgroundColor: '#8b5cf6' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Material requirement calculator */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                  <Sparkles size={18} /> Raw Material Forecast
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rice required:</span>
                    <strong style={{ color: '#10b981' }}>{rawRice} kg</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Wheat Flour (Atta):</span>
                    <strong style={{ color: '#10b981' }}>{rawAtta} kg</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Paneer (Premium plan):</span>
                    <strong style={{ color: '#10b981' }}>{rawPaneer} kg</strong>
                  </div>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px', lineHeight: '1.4' }}>
                  * Calculated dynamically based on active subscription settings per student plan tonight.
                </p>
              </div>
            </div>

            {/* Daily Add-ons & Live Feed */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '30px' }}>
              {/* Daily Add-ons Counts */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>⚡ Today's Add-on Order Summary</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontWeight: 500 }}>
                    Last Updated: {lastUpdatedTime}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {/* Roti */}
                  <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '24px' }}>🫓</span>
                    <h4 style={{ fontSize: '14px', margin: '8px 0 4px', color: 'var(--text-secondary)', fontWeight: 600 }}>Extra Roti</h4>
                    <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '4px 0' }}>{extraRotiCount} units</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>({extraRotiCount} × ₹15)</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981', margin: '6px 0 0' }}>₹{extraRotiCount * 15}</p>
                  </div>
                  
                  {/* Curd */}
                  <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '24px' }}>🥛</span>
                    <h4 style={{ fontSize: '14px', margin: '8px 0 4px', color: 'var(--text-secondary)', fontWeight: 600 }}>Curd Cups</h4>
                    <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '4px 0' }}>{curdCount} units</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>({curdCount} × ₹20)</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981', margin: '6px 0 0' }}>₹{curdCount * 20}</p>
                  </div>

                  {/* Gulab Jamun */}
                  <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '24px' }}>🍮</span>
                    <h4 style={{ fontSize: '14px', margin: '8px 0 4px', color: 'var(--text-secondary)', fontWeight: 600 }}>Gulab Jamun</h4>
                    <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '4px 0' }}>{jamunCount} units</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>({jamunCount} × ₹25)</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981', margin: '6px 0 0' }}>₹{jamunCount * 25}</p>
                  </div>

                  {/* Salad */}
                  <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '24px' }}>🥗</span>
                    <h4 style={{ fontSize: '14px', margin: '8px 0 4px', color: 'var(--text-secondary)', fontWeight: 600 }}>Salad Bowls</h4>
                    <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '4px 0' }}>{saladCount} units</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>({saladCount} × ₹15)</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981', margin: '6px 0 0' }}>₹{saladCount * 15}</p>
                  </div>
                </div>

                {/* Addon Summary statistics banner */}
                <div style={{ marginTop: '20px', padding: '12px 20px', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px dashed rgba(16, 185, 129, 0.3)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Today's Add-on Orders: <strong style={{ color: 'var(--text-primary)' }}>{todayAddonOrdersCount}</strong> • Items sold: <strong style={{ color: 'var(--text-primary)' }}>{extraRotiCount + curdCount + jamunCount + saladCount}</strong>
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>
                    Total Add-on Revenue: ₹{todayAddonRevenue}
                  </span>
                </div>

                {/* Yesterday Summary Gray Card */}
                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>📅</span>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>Yesterday's Summary</h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Performance reference from previous day</p>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    3 addon orders • ₹185 revenue
                  </div>
                </div>
              </div>

              {/* Real-time floating activity ticker panel */}
              <div 
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '16px', 
                  padding: '24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  maxHeight: '418px',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="live-pulse-icon" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                    Live System Feed
                  </h3>
                  <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, letterSpacing: '0.5px' }}>ONLINE</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                  {activityLogs.slice(0, 5).map((log, idx) => {
                    const type = log.activityType || '';
                    const mappings: Record<string, { bg: string, color: string, icon: string }> = {
                      signup: { bg: '#dcfce7', color: '#15803d', icon: '🆕' },
                      login: { bg: '#e0f2fe', color: '#0369a1', icon: '🔑' },
                      profile_update: { bg: '#f1f5f9', color: '#475569', icon: '👤' },
                      referral_applied: { bg: '#faf5ff', color: '#7e22ce', icon: '🎁' },
                      wallet_recharge_request: { bg: '#fef3c7', color: '#b45309', icon: '💳' },
                      wallet_recharge_approved: { bg: '#dcfce7', color: '#15803d', icon: '✅' },
                      wallet_recharge_rejected: { bg: '#fee2e2', color: '#b91c1c', icon: '❌' },
                      plan_subscribed: { bg: '#e0e7ff', color: '#4338ca', icon: '👑' },
                      order_placed: { bg: '#ffedd5', color: '#c2410c', icon: '🍛' },
                      order_dispatched: { bg: '#f3e8ff', color: '#6b21a8', icon: '🛵' },
                      order_delivered: { bg: '#dcfce7', color: '#15803d', icon: '📦' },
                      vacation_started: { bg: '#fee2e2', color: '#b91c1c', icon: '🏖️' },
                      vacation_cancelled: { bg: '#f1f5f9', color: '#475569', icon: '↩️' },
                      meal_rated: { bg: '#fef9c3', color: '#a16207', icon: '⭐' },
                      poll_voted: { bg: '#ecfdf5', color: '#047857', icon: '🗳️' },
                      admin_adjustment: { bg: '#e0f2fe', color: '#0369a1', icon: '⚙️' }
                    };
                    const style = mappings[type] || { bg: '#f1f5f9', color: '#475569', icon: '📝' };

                    return (
                      <div 
                        key={log._id || log.id || idx} 
                        className="activity-ticker-item"
                        style={{ 
                          display: 'flex', 
                          gap: '10px', 
                          alignItems: 'flex-start',
                          padding: '10px',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: '8px',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>{style.icon}</span>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-primary)', lineHeight: '1.4', fontWeight: 500 }}>
                            {log.description}
                          </span>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {activityLogs.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '20px 0' }}>
                      Waiting for activities...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Today's Active Kitchen Orders */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6' }}>
                <span>👨‍🍳</span> Active Kitchen Orders ({orders.filter(o => ['pending', 'cooking', 'packed'].includes(o.status)).length})
              </h3>
              
              {orders.filter(o => ['pending', 'cooking', 'packed'].includes(o.status)).length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {orders.filter(o => ['pending', 'cooking', 'packed'].includes(o.status)).map((order) => {
                    const studentName = order.user?.name || 'Student User';
                    const addressText = order.user?.addressLine 
                      ? `${order.user.addressLine}` 
                      : `Hostel: ${order.user?.addressHostel || 'BH-3'}, Room ${order.user?.addressRoom || 'N/A'}`;
                    return (
                      <div key={order._id || order.id} style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{studentName}</h4>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981' }}>₹{order.totalAmount}</span>
                          </div>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 8px' }}>📍 {addressText}</p>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                            {order.items?.map((item: any, idx: number) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <span>{item.name} x {item.quantity}</span>
                                <span>₹{item.price * item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', 
                            backgroundColor: order.status === 'cooking' ? 'rgba(59,130,246,0.15)' : order.status === 'packed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                            color: order.status === 'cooking' ? '#3b82f6' : order.status === 'packed' ? '#10b981' : '#f59e0b',
                            padding: '2px 6px', borderRadius: '4px'
                          }}>
                            {order.status === 'cooking' ? '👨‍🍳 Cooking' : order.status === 'packed' ? '📦 Packed' : '⏳ Pending'}
                          </span>
                          
                          {order.status === 'pending' && (
                            <button 
                              onClick={async () => {
                                try {
                                  await api.put(`/orders/${order._id || order.id}/status`, { status: 'cooking' });
                                  loadAllData();
                                } catch (err: any) {
                                  alert(`Failed to start cooking: ${err.message}`);
                                }
                              }}
                              style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                            >
                              🍳 Start Cooking
                            </button>
                          )}
                          
                          {order.status === 'cooking' && (
                            <button 
                              onClick={async () => {
                                try {
                                  await api.put(`/orders/${order._id || order.id}/status`, { status: 'packed' });
                                  loadAllData();
                                } catch (err: any) {
                                  alert(`Failed to pack order: ${err.message}`);
                                }
                              }}
                              style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                            >
                              📦 Pack
                            </button>
                          )}

                          {order.status === 'packed' && (
                            <button 
                              onClick={() => handleDispatch(order)}
                              style={{ backgroundColor: '#f97316', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                            >
                              🛵 Dispatch
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                  🎉 No active orders in preparation right now!
                </div>
              )}
            </div>

            {/* Live UPI Payment Approvals Panel */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#f59e0b' }}>
                <span>💳</span> Pending UPI Payment Approvals (Real-time)
              </h3>
              
              {transactions.filter(t => t.type === 'recharge' && t.status === 'pending').length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px' }}>Student Name</th>
                        <th style={{ padding: '12px' }}>Phone</th>
                        <th style={{ padding: '12px' }}>Amount</th>
                        <th style={{ padding: '12px' }}>UTR / Reference ID</th>
                        <th style={{ padding: '12px' }}>Request Date</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.filter(t => t.type === 'recharge' && t.status === 'pending').map((tx) => (
                        <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                          <td style={{ padding: '12px', fontWeight: 600 }}>{tx.profiles?.name || 'Student User'}</td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{tx.profiles?.phone || 'N/A'}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold', color: '#10b981' }}>₹{tx.amount}</td>
                          <td style={{ padding: '12px', fontFamily: 'monospace', color: '#f59e0b', fontSize: '13px', letterSpacing: '0.5px' }}>
                            {tx.utr || 'N/A'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {tx.created_at ? new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleRejectTransaction(tx)}
                              style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApproveTransaction(tx)}
                              style={{ backgroundColor: '#10b981', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                            >
                              Approve & Credit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                  ✅ No pending payment approvals. All recharges are up to date!
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Fleet Tracking & Map Simulator */}
        {activeTab === 'fleet' && roleMode !== 'support' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
              
              {/* Delivery Orders List */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>Hostel Shipments</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Select a packed meal and dispatch to simulate GPS movement.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  {orders.map((order) => {
                    const studentName = order.user?.name || 'Student';
                    const isNewAddress = !!order.user?.addressLine;
                    const addressText = isNewAddress 
                      ? `${order.user.addressLine}, ${order.user.city || ''} ${order.user.pincode || ''}`
                      : `Hostel: ${order.user?.addressHostel || order.user?.address_hostel || 'BH-3'} (Room ${order.user?.addressRoom || order.user?.address_room || '204'})`;
                    return (
                      <div key={order._id || order.id} style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{studentName}</h4>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', margin: 0 }}>
                              {addressText}
                            </p>
                            {order.isTiffinOrder ? (
                              <span style={{ fontSize: '10px', color: '#f97316', fontWeight: 600, display: 'block', marginTop: '4px' }}>🍱 Tiffin Subscription ({order.user?.plan || 'Standard'})</span>
                            ) : (
                              <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 600, display: 'block', marginTop: '4px' }}>🍔 Restaurant: {order.restaurant?.name || 'Partner Restaurant'}</span>
                            )}
                            <div style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase', 
                              backgroundColor: order.status === 'delivered' ? 'rgba(16,185,129,0.15)' : order.status === 'out_for_delivery' ? 'rgba(139,92,246,0.15)' : order.status === 'cooking' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
                              color: order.status === 'delivered' ? '#10b981' : order.status === 'out_for_delivery' ? '#8b5cf6' : order.status === 'cooking' ? '#3b82f6' : '#f59e0b'
                            }}>
                              {order.status === 'out_for_delivery' ? '🛵 Out For Delivery' : order.status === 'delivered' ? '✅ Delivered' : order.status === 'cooking' ? '👨‍🍳 Cooking' : order.status === 'packed' ? '📦 Packed' : '⏳ Pending'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px', justifyContent: 'flex-end' }}>
                          {order.status === 'pending' && (
                            <button 
                              onClick={async () => {
                                try {
                                  await api.put(`/orders/${order._id || order.id}/status`, { status: 'cooking' });
                                  loadAllData();
                                } catch (err: any) {
                                  alert(`Failed to start cooking: ${err.message}`);
                                }
                              }}
                              style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                            >
                              🍳 Start Cooking
                            </button>
                          )}
                          {order.status === 'cooking' && (
                            <button 
                              onClick={async () => {
                                try {
                                  await api.put(`/orders/${order._id || order.id}/status`, { status: 'packed' });
                                  loadAllData();
                                } catch (err: any) {
                                  alert(`Failed to pack order: ${err.message}`);
                                }
                              }}
                              style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                            >
                              📦 Pack Order
                            </button>
                          )}
                          {order.status === 'packed' && !dispatchedOrderId && (
                            <button 
                              onClick={() => handleDispatch(order)}
                              style={{ backgroundColor: '#f97316', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Send size={12} /> Dispatch
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GPS Live Map Simulator Graphic (SVG) */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MapPin size={18} style={{ color: '#ef4444' }} /> Campus GPS Fleet Monitor
                </h3>
                
                {/* SVG Live Simulation Area */}
                <div style={{ flex: 1, backgroundColor: 'var(--bg-primary)', borderRadius: '12px', border: '1px dashed #374151', position: 'relative', overflow: 'hidden', height: '360px' }}>
                  
                  {/* Central Kitchen */}
                  <div style={{ position: 'absolute', left: '20px', top: '160px', textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', margin: '0 auto' }}>🍳</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px', fontWeight: 600 }}>Central Kitchen</span>
                  </div>

                  {/* Hostel BH-1 */}
                  <div style={{ position: 'absolute', right: '140px', top: '30px', textAlign: 'center' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', margin: '0 auto' }}>🏢</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Boys Hostel-1</span>
                  </div>

                  {/* Hostel BH-3 */}
                  <div style={{ position: 'absolute', right: '40px', top: '80px', textAlign: 'center' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', margin: '0 auto' }}>🏢</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Boys Hostel-3</span>
                  </div>

                  {/* Hostel GH-2 */}
                  <div style={{ position: 'absolute', right: '80px', bottom: '60px', textAlign: 'center' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', margin: '0 auto' }}>🏢</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Girls Hostel-2</span>
                  </div>

                  {/* Road Paths */}
                  <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
                    {/* Path to BH-3 */}
                    <line x1="50" y1="180" x2="280" y2="100" stroke="var(--border)" strokeWidth="2" strokeDasharray="5" />
                    {/* Path to GH-2 */}
                    <line x1="50" y1="180" x2="320" y2="240" stroke="var(--border)" strokeWidth="2" strokeDasharray="5" />
                  </svg>

                   {/* Delivery Rider Dot Indicator */}
                  {dispatchedOrderId && (
                    <div style={{ position: 'absolute', left: `${riderPosition.x}px`, top: `${riderPosition.y}px`, transition: 'all 0.1s linear', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                      <div style={{ backgroundColor: '#8b5cf6', padding: '6px', borderRadius: '50%', boxShadow: '0 0 10px rgba(139,92,246,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '14px' }}>🛵</span>
                      </div>
                      <div style={{ position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        Dispatched {deliveryProgress}%
                      </div>
                    </div>
                  )}

                  {/* Live Tracked Riders from GPS */}
                  {Object.values(liveRiders).map((rider: any) => {
                    const pos = mapCoordsToSvg(rider.latitude, rider.longitude);
                    return (
                      <div key={rider.riderId} style={{ position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transition: 'all 1s ease', transform: 'translate(-50%, -50%)', zIndex: 12 }}>
                        <div style={{ backgroundColor: '#10B981', padding: '7px', borderRadius: '50%', boxShadow: '0 0 12px rgba(16,185,129,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                          <span style={{ fontSize: '14px' }}>🛵</span>
                        </div>
                        <div style={{ position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--bg-secondary)', border: '1.5px solid #10B981', color: 'var(--text-primary)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                          🟢 {rider.riderName} {rider.riderVehicle ? `(${rider.riderVehicle})` : ''} (Live)
                        </div>
                      </div>
                    );
                  })}

                  {!dispatchedOrderId && Object.keys(liveRiders).length === 0 && (
                    <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Ready to Dispatch. Active riders will show up moving live on this map in real-time.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CRM & Refund Console */}
        {activeTab === 'crm' && roleMode !== 'kitchen' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Student Profiles (CRM)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Search students, check wallet balances, and issue refunds instantly.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '10px', width: '320px' }}>
                <Search size={16} style={{ color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Search student by name or phone..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ backgroundColor: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Student Table */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '16px' }}>Student Name</th>
                    <th style={{ padding: '16px' }}>Phone Number</th>
                    <th style={{ padding: '16px' }}>Address</th>
                    <th style={{ padding: '16px' }}>Active Plan</th>
                    <th style={{ padding: '16px' }}>Streak</th>
                    <th style={{ padding: '16px' }}>Wallet Balance</th>
                    <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((profile) => (
                    <tr key={profile._id || profile.id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      <td style={{ padding: '16px', fontWeight: 600 }}>{profile.name || 'Student User'}</td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{profile.email || profile.phone || 'N/A'}</td>
                      <td style={{ padding: '16px', fontSize: '13px' }}>
                        {profile.addressLine 
                          ? `${profile.addressLine}, ${profile.city || ''}, ${profile.state || ''} ${profile.pincode || ''}`
                          : (profile.addressHostel || profile.address_hostel
                            ? `${profile.addressHostel || profile.address_hostel}, Room ${profile.addressRoom || profile.address_room || ''}`
                            : 'Not set'
                          )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase', 
                          backgroundColor: profile.plan === 'premium' ? 'rgba(139,92,246,0.15)' : profile.plan === 'standard' ? 'rgba(249,115,22,0.15)' : profile.plan === 'basic' ? 'rgba(59,130,246,0.15)' : 'var(--bg-tertiary)',
                          color: profile.plan === 'premium' ? '#8b5cf6' : profile.plan === 'standard' ? '#f97316' : profile.plan === 'basic' ? '#3b82f6' : 'var(--text-secondary)'
                        }}>
                          {profile.plan || 'None'}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>🔥 {profile.streak || 0}</td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 'bold', color: Number(profile.walletBalance || profile.wallet_balance || 0) < 90 && profile.plan !== 'none' ? '#ef4444' : '#10b981' }}>
                            ₹{profile.walletBalance || profile.wallet_balance || profile.wallet_use || 0}
                          </span>
                          {Number(profile.walletBalance || profile.wallet_balance || 0) < 90 && profile.plan !== 'none' && (
                            <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>
                              ⚠️ Low Balance (Needs Refill)
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button 
                            onClick={() => setSelectedUser(profile)}
                            style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          >
                            💸 Issue Credit / Refund
                          </button>
                          <button 
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete student ${profile.name || 'this user'}? This action is permanent and cannot be undone.`)) {
                                try {
                                  await api.delete(`/admin/users/${profile._id || profile.id}`);
                                  setProfiles(prev => prev.filter(p => (p._id || p.id) !== (profile._id || profile.id)));
                                  alert('Student profile deleted successfully.');
                                } catch (e: any) {
                                  console.error('Delete user error:', e);
                                  alert(`Failed to delete student: ${e.response?.data?.message || e.message}`);
                                }
                              }
                            }}
                            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Delete Student Profile"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No students found matching query.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Riders Table Section */}
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '10px' }}>Riders Registry (Fleet Crew)</h3>
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '16px' }}>Rider Name</th>
                      <th style={{ padding: '16px' }}>Phone Number</th>
                      <th style={{ padding: '16px' }}>Vehicle Number</th>
                      <th style={{ padding: '16px' }}>Login PIN</th>
                      <th style={{ padding: '16px' }}>Status</th>
                      <th style={{ padding: '16px' }}>Tiffin Recovery</th>
                      <th style={{ padding: '16px' }}>Completed Trips</th>
                      <th style={{ padding: '16px' }}>Registration Date</th>
                      <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRiders.map((rider) => {
                      const rId = rider._id || rider.id;
                      const riderOrders = allOrders.filter((o: any) => {
                        const assignedRiderId = o.rider?._id || o.rider?.id || o.rider;
                        return String(assignedRiderId) === String(rId);
                      });
                      const tiffinDeliveries = riderOrders.filter((o: any) => o.isTiffinOrder && o.status === 'delivered');
                      const recoveredTiffins = tiffinDeliveries.filter((o: any) => o.emptyTiffinCollected).length;
                      const recoveryRate = tiffinDeliveries.length > 0 
                        ? Math.round((recoveredTiffins / tiffinDeliveries.length) * 100) 
                        : 100;

                      return (
                        <tr key={rId} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                          <td style={{ padding: '16px', fontWeight: 600 }}>{rider.name || 'Rider Partner'}</td>
                          <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{rider.phone || 'N/A'}</td>
                          <td style={{ padding: '16px', fontWeight: 600, color: '#2563EB' }}>{rider.vehicle || 'Not Set'}</td>
                          <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>🔑 {rider.riderPin || 'N/A'}</td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ 
                              fontSize: '11px', 
                              padding: '3px 8px', 
                              borderRadius: '4px', 
                              fontWeight: 600, 
                              backgroundColor: rider.isOnline !== false ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', 
                              color: rider.isOnline !== false ? '#10b981' : '#6b7280', 
                              textTransform: 'uppercase' 
                            }}>
                              {rider.isOnline !== false ? '🟢 Online' : '⚪ Offline'}
                            </span>
                          </td>
                          <td style={{ padding: '16px', fontWeight: 600, color: recoveryRate >= 80 ? '#10B981' : '#F59E0B' }}>
                            🔄 {recoveryRate}% ({recoveredTiffins}/{tiffinDeliveries.length})
                          </td>
                          <td style={{ padding: '16px', fontWeight: 700 }}>
                            🛵 {riderOrders.filter((o: any) => o.status === 'delivered').length} trips
                          </td>
                          <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {rider.createdAt ? new Date(rider.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <button 
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to delete rider ${rider.name || 'this rider'}? This action is permanent and cannot be undone.`)) {
                                  try {
                                    await api.delete(`/admin/users/${rider._id || rider.id}`);
                                    setProfiles(prev => prev.filter(p => (p._id || p.id) !== (rider._id || rider.id)));
                                    alert('Rider profile deleted successfully.');
                                  } catch (e: any) {
                                    console.error('Delete rider error:', e);
                                    alert(`Failed to delete rider: ${e.response?.data?.message || e.message}`);
                                  }
                                }
                              }}
                              style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }}
                              title="Delete Rider Profile"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRiders.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No riders registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Refund dialog Modal */}
            {selectedUser && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', width: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Issue Wallet Refund</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Add credits to {selectedUser.name}'s wallet immediately.</p>
                  </div>
                  
                  <form onSubmit={handleRefundSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Refund Amount (₹)</label>
                      <input 
                        type="number" 
                        value={refundAmount} 
                        onChange={(e) => setRefundAmount(e.target.value)}
                        style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', outline: 'none', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Reason / Description</label>
                      <select 
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                      >
                        <option value="Late Delivery">Late Delivery / Delay</option>
                        <option value="Poor Food Quality">Poor Food Quality / Feedback</option>
                        <option value="Tiffin Paused Refund">Vacation Pause Credit</option>
                        <option value="Promotional Gift">Special Promotional Gift</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                      <button 
                        type="button" 
                        onClick={() => setSelectedUser(null)}
                        style={{ flex: 1, backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                      >Cancel</button>
                      <button 
                        type="submit"
                        style={{ flex: 1, backgroundColor: '#f97316', border: 'none', color: 'var(--text-primary)', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                      >Confirm Refund</button>
                    </div>
                  </form>
                </div>
              </div>
            )}


          </div>
        )}

        {/* TAB 4: Reviews & Feedback */}
        {activeTab === 'reviews' && roleMode !== 'kitchen' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* ── SECTION 1: Live Meal Ratings ── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⭐ Aaj Ki Meal Ratings
                    <span style={{ fontSize: '12px', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '12px', padding: '2px 10px', fontWeight: 600 }}>
                      LIVE
                    </span>
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Students app se rate karte hi yahan instantly aata hai • Today: {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div style={{ textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: '2px solid #F59E0B', borderRadius: '16px', padding: '12px 20px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#F59E0B' }}>
                    {mealRatingsAvg > 0 ? mealRatingsAvg : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Avg / 5 • {mealRatings.length} ratings</div>
                  <div style={{ fontSize: '14px', marginTop: '2px' }}>
                    {'★'.repeat(Math.round(mealRatingsAvg)).split('').map((s, i) => <span key={i} style={{ color: '#F59E0B' }}>{s}</span>)}
                    {'★'.repeat(5 - Math.round(mealRatingsAvg)).split('').map((s, i) => <span key={i} style={{ color: 'var(--border)' }}>★</span>)}
                  </div>
                </div>
              </div>

              {mealRatings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>⭐</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Abhi tak koi rating nahi aayi. Student app se rate karo to yahan live dikhega!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {mealRatings.map((r: any, idx: number) => (
                    <div key={r.ratingId || idx} style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: r.rating <= 2 ? '1.5px solid rgba(239,68,68,0.6)' : r.rating === 5 ? '1.5px solid rgba(34,197,94,0.5)' : '1px solid var(--border)',
                      borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px',
                      position: 'relative'
                    }}>
                      {/* Live badge */}
                      <div style={{ position: 'absolute', top: '12px', right: '12px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.userName || 'Student'}</h4>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.mealName} • {r.dayName}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1px' }}>
                          {[1,2,3,4,5].map(s => (
                            <span key={s} style={{ fontSize: '16px', color: s <= r.rating ? '#F59E0B' : 'var(--border)' }}>★</span>
                          ))}
                        </div>
                      </div>

                      {r.comment && (
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5', fontStyle: 'italic' }}>
                          "{r.comment}"
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>{r.date}</span>
                        {r.rating <= 2 && (
                          <span style={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={11} /> Attention needed
                          </span>
                        )}
                        {r.rating === 5 && <span style={{ color: '#22C55E', fontWeight: 600 }}>🌟 Excellent!</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── SECTION 2: Live Vacation Requests ── */}
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🏖️ Vacation Requests
                  <span style={{ fontSize: '12px', backgroundColor: '#EDE9FE', color: '#5B21B6', borderRadius: '12px', padding: '2px 10px', fontWeight: 600 }}>
                    LIVE
                  </span>
                  {vacationRequests.filter((v: any) => v.status === 'pending').length > 0 && (
                    <span style={{ fontSize: '12px', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '12px', padding: '2px 10px', fontWeight: 700 }}>
                      {vacationRequests.filter((v: any) => v.status === 'pending').length} Pending
                    </span>
                  )}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Student vacation mode set karte hi yahan instantly aata hai. Approve karo to student ka tiffin pause ho jaayega.
                </p>
              </div>

              {vacationRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏖️</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Koi vacation request nahi hai. Student app se vacation set karo to yahan live dikhega!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {vacationRequests.filter((v: any) => v.status !== 'cancelled').map((vac: any, idx: number) => (
                    <div key={vac.requestId || idx} style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: vac.status === 'pending' ? '1.5px solid #F59E0B' : vac.status === 'active' ? '1.5px solid #22C55E' : '1px solid var(--border)',
                      borderRadius: '16px', padding: '18px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{vac.userName}</h4>
                          <span style={{
                            fontSize: '11px', padding: '2px 10px', borderRadius: '10px', fontWeight: 600,
                            backgroundColor: vac.status === 'pending' ? '#FEF3C7' : vac.status === 'active' ? '#D1FAE5' : '#F3F4F6',
                            color: vac.status === 'pending' ? '#92400E' : vac.status === 'active' ? '#065F46' : '#6B7280'
                          }}>
                            {vac.status === 'pending' ? '⏳ Pending Approval' : vac.status === 'active' ? '✅ Approved - On Vacation' : vac.status}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          📅 {vac.startDate} → {vac.endDate} &nbsp;•&nbsp; {vac.days} din &nbsp;•&nbsp; 📞 {vac.phone || 'N/A'}
                        </p>
                        {vac.reason && (
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                            Reason: "{vac.reason}"
                          </p>
                        )}
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Requested: {new Date(vac.requestedAt || Date.now()).toLocaleString('en-IN')}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      {vac.status === 'pending' && vac.userId && vac.requestId && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={async () => {
                              try {
                                await api.put(`/admin/vacations/${vac.userId}/${vac.requestId}/status`, { status: 'active' });
                                setVacationRequests(prev => prev.map((v: any) =>
                                  v.requestId === vac.requestId ? { ...v, status: 'active' } : v
                                ));
                              } catch (e) { alert('Error approving vacation'); }
                            }}
                            style={{ padding: '8px 16px', borderRadius: '10px', backgroundColor: '#22C55E', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await api.put(`/admin/vacations/${vac.userId}/${vac.requestId}/status`, { status: 'cancelled' });
                                setVacationRequests(prev => prev.map((v: any) =>
                                  v.requestId === vac.requestId ? { ...v, status: 'cancelled' } : v
                                ));
                              } catch (e) { alert('Error declining vacation'); }
                            }}
                            style={{ padding: '8px 16px', borderRadius: '10px', backgroundColor: 'transparent', color: '#EF4444', border: '1.5px solid #EF4444', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                          >
                            ❌ Decline
                          </button>
                        </div>
                      )}
                      {vac.status === 'active' && vac.userId && vac.requestId && (
                        <button
                          onClick={async () => {
                            try {
                              await api.put(`/admin/vacations/${vac.userId}/${vac.requestId}/status`, { status: 'completed' });
                              setVacationRequests(prev => prev.map((v: any) =>
                                v.requestId === vac.requestId ? { ...v, status: 'completed' } : v
                              ));
                            } catch (e) { alert('Error completing vacation'); }
                          }}
                          style={{ padding: '8px 16px', borderRadius: '10px', backgroundColor: '#6B7280', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                        >
                          🏠 Mark Complete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── SECTION 3: Weekly Special Food Poll (Real-time) ── */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '28px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🗳️ Weekly Special Food Poll
                  <span style={{ fontSize: '12px', backgroundColor: 'rgba(249,115,22,0.15)', color: '#f97316', borderRadius: '12px', padding: '2px 10px', fontWeight: 600 }}>
                    REAL-TIME
                  </span>
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Manage the active voting poll and monitor candidate selection statistics in real-time.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                {/* Poll Status Card */}
                <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px' }}>Active Poll Details</span>
                    {activePoll ? (
                      <>
                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '6px', marginBottom: '16px' }}>
                          "{activePoll.question}"
                        </h4>

                        {/* Votes breakdown */}
                        {(() => {
                          const votesA = activePoll.votes_a || 0;
                          const votesB = activePoll.votes_b || 0;
                          const total = votesA + votesB;
                          const pctA = total > 0 ? Math.round((votesA / total) * 100) : 50;
                          const pctB = total > 0 ? Math.round((votesB / total) * 100) : 50;
                          
                          // Determine leader
                          let leaderMessage = '';
                          let leaderStyle = {};
                          if (total === 0) {
                            leaderMessage = '⏳ No votes cast yet.';
                            leaderStyle = { color: 'var(--text-muted)' };
                          } else if (votesA > votesB) {
                            leaderMessage = `🏆 "${activePoll.option_a}" is leading by ${votesA - votesB} vote(s)!`;
                            leaderStyle = { color: '#10b981', fontWeight: 'bold', backgroundColor: 'rgba(16,185,129,0.08)', padding: '10px 16px', borderRadius: '8px', border: '1px dashed rgba(16,185,129,0.3)' };
                          } else if (votesB > votesA) {
                            leaderMessage = `🏆 "${activePoll.option_b}" is leading by ${votesB - votesA} vote(s)!`;
                            leaderStyle = { color: '#10b981', fontWeight: 'bold', backgroundColor: 'rgba(16,185,129,0.08)', padding: '10px 16px', borderRadius: '8px', border: '1px dashed rgba(16,185,129,0.3)' };
                          } else {
                            leaderMessage = `🤝 Both options are tied at ${votesA} votes each!`;
                            leaderStyle = { color: '#f59e0b', fontWeight: 'bold', backgroundColor: 'rgba(245,158,11,0.08)', padding: '10px 16px', borderRadius: '8px', border: '1px dashed rgba(245,158,11,0.3)' };
                          }

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                              {/* Option A bar */}
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                  <span style={{ fontWeight: votesA >= votesB && total > 0 ? 600 : 400, color: votesA >= votesB && total > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                    {activePoll.option_a} {votesA >= votesB && total > 0 && '⭐'}
                                  </span>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{votesA} votes ({pctA}%)</span>
                                </div>
                                <div style={{ height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pctA}%`, backgroundColor: '#f97316' }} />
                                </div>
                              </div>

                              {/* Option B bar */}
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                  <span style={{ fontWeight: votesB >= votesA && total > 0 ? 600 : 400, color: votesB >= votesA && total > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                    {activePoll.option_b} {votesB >= votesA && total > 0 && '⭐'}
                                  </span>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{votesB} votes ({pctB}%)</span>
                                </div>
                                <div style={{ height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pctB}%`, backgroundColor: '#3b82f6' }} />
                                </div>
                              </div>

                              {/* Leader Message Display */}
                              <div style={{ fontSize: '13px', textAlign: 'center', marginTop: '10px', ...leaderStyle }}>
                                {leaderMessage}
                              </div>

                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                                Total Votes Count: {total}
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>No active poll running. Deploy a new poll on the right to start voting!</p>
                    )}
                  </div>
                </div>

                {/* Create New Poll Card */}
                <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px' }}>Deploy New Weekly Special Poll</span>
                  <form onSubmit={handleCreatePoll} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Poll Question</label>
                      <input 
                        type="text" 
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        placeholder="e.g. What should be Saturday's Special?"
                        style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', outline: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}
                        required 
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Option A Description</label>
                      <input 
                        type="text" 
                        value={pollOptionA}
                        onChange={(e) => setPollOptionA(e.target.value)}
                        placeholder="e.g. Chole Bhature 🍛"
                        style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', outline: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}
                        required 
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Option B Description</label>
                      <input 
                        type="text" 
                        value={pollOptionB}
                        onChange={(e) => setPollOptionB(e.target.value)}
                        placeholder="e.g. Paneer Tikka 🧀"
                        style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', outline: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}
                        required 
                      />
                    </div>

                    <button 
                      type="submit" 
                      style={{ backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
                    >
                      🚀 Deploy & Broadcast Poll
                    </button>
                  </form>
                </div>
              </div>
            </div>

          </div>
        )}


        {/* TAB 5: Menu Management */}
        {activeTab === 'menu' && roleMode !== 'support' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Weekly Menu Manager</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Update the daily menu. Changes reflect instantly on the student app.</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              {weeklyMenu.map((day) => (
                <div key={day.id} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                    <input 
                      type="text" 
                      value={day.emoji} 
                      onChange={(e) => handleMenuChange(day.id, 'emoji', e.target.value)}
                      style={{ background: 'transparent', border: 'none', width: '40px', textAlign: 'center', fontSize: '24px', outline: 'none' }} 
                    />
                  </div>
                  
                  <div style={{ width: '100px' }}>
                    <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>{day.day_name}</h4>
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', gap: '12px' }}>
                    <input 
                      type="text" 
                      value={day.main_dish} 
                      onChange={(e) => handleMenuChange(day.id, 'main_dish', e.target.value)}
                      placeholder="Main Dish"
                      style={{ flex: 1, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                    <input 
                      type="text" 
                      value={day.side_dish} 
                      onChange={(e) => handleMenuChange(day.id, 'side_dish', e.target.value)}
                      placeholder="Side Dish"
                      style={{ flex: 1, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                  
                  <button 
                    onClick={() => saveMenuDay(day)}
                    style={{ backgroundColor: '#10b981', border: 'none', color: 'var(--text-primary)', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                  >
                    Save
                  </button>
                </div>
              ))}
            </div>


          </div>
        )}

        {/* TAB 7: Restaurant Menu Editor */}
        {activeTab === 'restaurant-menu' && roleMode !== 'support' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Restaurant Menu Editor</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Manage menus, create sections dynamically, and toggle item availability in real-time.
                </p>
              </div>
              <button
                onClick={() => setShowRestaurantModal(true)}
                style={{
                  backgroundColor: '#f97316',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 6px -1px rgba(249,115,22,0.2)',
                  transition: 'all 0.2s'
                }}
              >
                ➕ Add New Section / Restaurant
              </button>
            </div>

            {restaurants.length === 0 ? (
              <div style={{ padding: '24px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                No restaurants found or loading...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {restaurants.map((restaurant) => {
                  // Handle dynamic custom category creation
                  const handleAddCategory = () => {
                    const sectionName = window.prompt("Enter new section name (e.g. Drinks, Desserts, Starters):");
                    if (sectionName && sectionName.trim()) {
                      const trimmed = sectionName.trim();
                      setCustomCategories(prev => {
                        const existing = prev[restaurant._id] || [];
                        if (existing.map(e => e.toLowerCase()).includes(trimmed.toLowerCase())) {
                          alert(`Section "${trimmed}" already exists.`);
                          return prev;
                        }
                        return {
                          ...prev,
                          [restaurant._id]: [...existing, trimmed]
                        };
                      });
                    }
                  };

                  const items = restaurant.menuItems || [];
                  const restaurantCats = customCategories[restaurant._id] || [];
                  
                  // Extract all categories from items and merge with customCategories
                  const itemCats = Array.from(new Set(items.map((i: any) => i.category || 'Popular Dishes'))) as string[];
                  const categoriesToRender = Array.from(new Set([...restaurantCats, ...itemCats]));

                  return (
                    <div key={restaurant._id} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {restaurant.image && (
                            <img src={restaurant.image} alt={restaurant.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                          )}
                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{restaurant.name}</h4>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{restaurant.cuisine} • {restaurant.deliveryTime}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button
                            onClick={handleAddCategory}
                            style={{
                              backgroundColor: '#f97316',
                              border: 'none',
                              color: '#ffffff',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            ➕ Create New Section
                          </button>
                          <button
                            onClick={() => handleDeleteRestaurant(restaurant._id, restaurant.name)}
                            style={{
                              backgroundColor: 'rgba(239,68,68,0.1)',
                              border: '1px solid rgba(239,68,68,0.3)',
                              color: '#ef4444',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s'
                            }}
                          >
                            🗑️ Delete Section
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {categoriesToRender.map((categoryName) => {
                          const catItems = items.filter((item: any) => (item.category || 'Popular Dishes').toLowerCase() === categoryName.toLowerCase());
                          return (
                            <div key={categoryName} style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                                <h5 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, borderLeft: '3px solid #f97316', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  {categoryName}
                                </h5>
                                <button
                                  onClick={() => openAddItemModal(restaurant._id, categoryName)}
                                  style={{
                                    backgroundColor: 'transparent',
                                    border: '1px solid #f97316',
                                    color: '#f97316',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  ➕ Add Dish to {categoryName}
                                </button>
                              </div>

                              {catItems.length === 0 ? (
                                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                                  No dishes in this section yet. Click "Add Dish to {categoryName}" to add one!
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                  {catItems.map((item: any) => {
                                    const isVeg = item.isVeg !== false;
                                    const isAvailable = item.isAvailable !== false;
                                    return (
                                      <div key={item._id} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', opacity: isAvailable ? 1 : 0.8 }}>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                          {item.image && (
                                            <img src={item.image} alt={item.name} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                                          )}
                                          <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '12px' }}>{isVeg ? '🟢' : '🔴'}</span>
                                                <h5 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{item.name}</h5>
                                              </div>
                                              <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                  onClick={() => openEditItemModal(restaurant._id, item)}
                                                  title="Edit Dish"
                                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px' }}
                                                >
                                                  ✏️
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteItem(restaurant._id, item._id || item.id, item.name)}
                                                  title="Delete Dish"
                                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px' }}
                                                >
                                                  🗑️
                                                </button>
                                              </div>
                                            </div>
                                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>
                                          </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f97316' }}>₹{item.price}</span>
                                            {item.originalPrice && item.originalPrice > item.price && (
                                              <>
                                                <span style={{ fontSize: '12px', textDecoration: 'line-through', color: 'var(--text-secondary)' }}>₹{item.originalPrice}</span>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                                  {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                                                </span>
                                              </>
                                            )}
                                          </div>
                                          <button
                                            onClick={() => toggleItemAvailability(restaurant._id, item._id, isAvailable)}
                                            style={{
                                              backgroundColor: isAvailable ? '#10b981' : '#ef4444',
                                              border: 'none',
                                              color: '#ffffff',
                                              padding: '6px 12px',
                                              borderRadius: '20px',
                                              cursor: 'pointer',
                                              fontWeight: 600,
                                              fontSize: '12px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              transition: 'all 0.2s ease',
                                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}
                                          >
                                            {isAvailable ? (
                                              <>🟢 Available</>
                                            ) : (
                                              <>🔴 Out of Stock</>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5b: Riders Management Section */}
        {activeTab === 'riders-mgmt' && roleMode !== 'support' && (
          <RidersManagementView 
            profiles={profiles} 
            orders={orders} 
            loadAllData={loadAllData} 
          />
        )}

        {/* TAB 6: Finance & Analytics */}
        {activeTab === 'finance' && roleMode === 'owner' && (() => {
          const last7DaysData = getRevenueForLast7Days();
          const maxRevenue = Math.max(...last7DaysData.map(d => d.revenue), 1);
          const maxRecharges = Math.max(...last7DaysData.map(d => d.recharges), 1);
          const overallMax = Math.max(maxRevenue, maxRecharges, 100);

          const chartHeight = 260;
          const chartWidth = 720;
          const paddingLeft = 50;
          const paddingBottom = 60;
          const paddingTop = 20;
          const paddingRight = 20;

          const graphWidth = chartWidth - paddingLeft - paddingRight;
          const graphHeight = chartHeight - paddingTop - paddingBottom;

          // Points calculation
          const pointsRevenue = last7DaysData.map((d, index) => {
            const x = paddingLeft + (index * (graphWidth / 6));
            const y = paddingTop + graphHeight - ((d.revenue / overallMax) * graphHeight);
            return { x, y, val: d.revenue, label: d.dateLabel };
          });

          const pointsRecharges = last7DaysData.map((d, index) => {
            const x = paddingLeft + (index * (graphWidth / 6));
            const y = paddingTop + graphHeight - ((d.recharges / overallMax) * graphHeight);
            return { x, y, val: d.recharges };
          });

          const linePathRevenue = pointsRevenue.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          const linePathRecharges = pointsRecharges.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Earnings & Financial Dashboard</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Track daily earnings, cash collections, liabilities, and historic trends.</p>
              </div>

              {/* Financial Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Today's Revenue</span>
                  <h3 style={{ fontSize: '28px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#10b981' }}>₹{todayRevenue}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Delivered tiffins today</span>
                </div>

                <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Today's Cash Inflow</span>
                  <h3 style={{ fontSize: '28px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#f59e0b' }}>₹{todayCashInflow}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Approved wallet recharges</span>
                </div>

                <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>All-Time Revenue</span>
                  <h3 style={{ fontSize: '28px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#10b981' }}>₹{allTimeRevenue}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Delivered meals value ever</span>
                </div>

                <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>All-Time Inflow</span>
                  <h3 style={{ fontSize: '28px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#f59e0b' }}>₹{allTimeCashInflow}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Wallet deposits approved ever</span>
                </div>
              </div>

              {/* Dynamic SVG Charts Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                {/* SVG Line Chart (7-Day Trend) */}
                <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={16} style={{ color: '#10b981' }} /> Last 7 Days Revenue Trend (₹)
                  </h4>
                  
                  {/* Line Chart Graphic */}
                  <div style={{ position: 'relative' }}>
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                        const y = paddingTop + graphHeight * r;
                        const labelVal = Math.round(overallMax * (1 - r));
                        return (
                          <g key={i}>
                            <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="var(--bg-tertiary)" strokeWidth="1" />
                            <text x={paddingLeft - 10} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">{labelVal}</text>
                          </g>
                        );
                      })}

                      {/* X-Axis Labels */}
                      {pointsRevenue.map((p, i) => (
                        <text key={i} x={p.x} y={chartHeight - paddingBottom + 25} fill="var(--text-muted)" fontSize="10" textAnchor="middle">
                          {p.label}
                        </text>
                      ))}

                      {/* Recharges Path */}
                      <path d={linePathRecharges} fill="none" stroke="#d97706" strokeWidth="2" strokeDasharray="4 4" />
                      
                      {/* Revenue Path */}
                      <path d={linePathRevenue} fill="none" stroke="#10b981" strokeWidth="3" />

                      {/* Points Circles */}
                      {pointsRevenue.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="5" fill="#10b981" stroke="var(--bg-secondary)" strokeWidth="1.5" />
                          {p.val > 0 && (
                            <text x={p.x} y={p.y - 10} fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle">₹{p.val}</text>
                          )}
                        </g>
                      ))}
                      
                      {pointsRecharges.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="4" fill="#d97706" stroke="var(--bg-secondary)" strokeWidth="1" />
                          {p.val > 0 && (
                            <text x={p.x} y={p.y + 16} fill="#d97706" fontSize="9" textAnchor="middle">₹{p.val}</text>
                          )}
                        </g>
                      ))}
                    </svg>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px', justifyContent: 'center', fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '12px', height: '3px', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                        <span style={{ color: 'var(--text-secondary)' }}>Revenue Earned (Delivered Meals)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '12px', height: '3px', borderTop: '2px dashed #d97706', display: 'inline-block' }}></span>
                        <span style={{ color: 'var(--text-secondary)' }}>Cash Collected (Recharges Approved)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wallet Liability Breakdown */}
                <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Ledger Distribution</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Basic Subscription Value:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{allOrders.filter(o => o.isTiffinOrder && o.user?.plan === 'basic' && o.status === 'delivered').length * 70}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Standard Subscription Value:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{allOrders.filter(o => o.isTiffinOrder && o.user?.plan === 'standard' && o.status === 'delivered').length * 90}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Premium Subscription Value:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{allOrders.filter(o => o.isTiffinOrder && o.user?.plan === 'premium' && o.status === 'delivered').length * 130}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Outstanding Liability:</span>
                      <span style={{ fontWeight: 'bold', color: '#8b5cf6' }}>₹{profiles.reduce((sum, p) => sum + Number(p.walletBalance || p.wallet_balance || 0), 0)}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: 'auto' }}>
                    Outstanding Liability measures active student wallet balances that represent prepaid meals not yet cooked or delivered.
                  </p>
                </div>
              </div>

              {/* Transactions Ledger Searchable Grouped Accordion View */}
              {(() => {
                // Group transactions by student name
                const groupedTransactions: Record<string, {
                  studentName: string;
                  profile: any;
                  transactions: any[];
                  totalRecharged: number;
                  totalSpent: number;
                }> = {};

                transactions.forEach(tx => {
                  const name = tx.profiles?.name || 'Student User';
                  if (!groupedTransactions[name]) {
                    const prof = profiles.find(p => p.name === name) || {
                      name,
                      phone: tx.profiles?.phone || 'N/A',
                      plan: 'none',
                      walletBalance: tx.profiles?.walletBalance || 0
                    };
                    groupedTransactions[name] = {
                      studentName: name,
                      profile: prof,
                      transactions: [],
                      totalRecharged: 0,
                      totalSpent: 0
                    };
                  }

                  groupedTransactions[name].transactions.push(tx);

                  if (tx.status === 'approved') {
                    if (tx.type === 'recharge' || tx.type === 'refund' || tx.type === 'referral_bonus') {
                      groupedTransactions[name].totalRecharged += tx.amount;
                    } else {
                      groupedTransactions[name].totalSpent += Math.abs(tx.amount);
                    }
                  }
                });

                // Filter groups by search query
                const filteredGroups = Object.values(groupedTransactions).filter(group => 
                  group.studentName.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
                  (group.profile?.phone || '').includes(ledgerSearchQuery)
                );

                return (
                  <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Student Financial Ledger</h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Transactions grouped by student. Click a student card to see their complete history.</p>
                      </div>
                      
                      {/* Ledger Search Input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '10px', width: '300px' }}>
                        <Search size={16} style={{ color: 'var(--text-secondary)' }} />
                        <input 
                          type="text" 
                          placeholder="Search student ledger..." 
                          value={ledgerSearchQuery}
                          onChange={(e) => setledgerSearchQuery ? setLedgerSearchQuery(e.target.value) : setLedgerSearchQuery(e.target.value)}
                          style={{ backgroundColor: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '13px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {filteredGroups.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
                          No matching student ledgers found.
                        </div>
                      ) : (
                        filteredGroups.map(group => {
                          const isExpanded = !!expandedLedgerUsers[group.studentName];
                          const planColor = group.profile?.plan === 'premium' ? '#8B5CF6' : group.profile?.plan === 'standard' ? '#F97316' : group.profile?.plan === 'basic' ? '#3B82F6' : '#888';
                          return (
                            <div 
                              key={group.studentName}
                              style={{ border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: isExpanded ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', overflow: 'hidden', transition: 'background-color 0.2s' }}
                            >
                              {/* Accordion Header */}
                              <div 
                                onClick={() => setExpandedLedgerUsers(prev => ({ ...prev, [group.studentName]: !prev[group.studentName] }))}
                                style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap', gap: '16px' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#f97316' }}>
                                    {group.studentName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{group.studentName}</h4>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📞 {group.profile?.phone || 'N/A'}</span>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Active Plan</div>
                                    <span style={{ textTransform: 'capitalize', fontSize: '10px', padding: '2px 8px', borderRadius: '6px', color: '#FFFFFF', backgroundColor: planColor, fontWeight: 600 }}>
                                      {group.profile?.plan || 'None'}
                                    </span>
                                  </div>

                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Recharged</div>
                                    <span style={{ fontWeight: 'bold', color: '#10B981', fontSize: '13px' }}>+₹{group.totalRecharged}</span>
                                  </div>

                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Spent</div>
                                    <span style={{ fontWeight: 'bold', color: '#EF4444', fontSize: '13px' }}>-₹{group.totalSpent}</span>
                                  </div>

                                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Wallet Balance</div>
                                    <span style={{ fontWeight: 'bold', color: '#3B82F6', fontSize: '15px' }}>₹{group.profile?.walletBalance || 0}</span>
                                  </div>

                                  <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                                    {isExpanded ? '▼' : '▶'}
                                  </span>
                                </div>
                              </div>

                              {/* Accordion Content */}
                              {isExpanded && (
                                <div style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', padding: '16px 20px', overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '10px' }}>Tx ID</th>
                                        <th style={{ padding: '10px' }}>Type</th>
                                        <th style={{ padding: '10px' }}>Description</th>
                                        <th style={{ padding: '10px' }}>UTR Code</th>
                                        <th style={{ padding: '10px' }}>Amount</th>
                                        <th style={{ padding: '10px' }}>Status</th>
                                        <th style={{ padding: '10px' }}>Date</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.transactions.map((tx) => {
                                        const isPositive = tx.type === 'recharge' || tx.type === 'refund' || tx.type === 'referral_bonus';
                                        return (
                                          <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                                            <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>{tx.id.substring(0, 8)}...</td>
                                            <td style={{ padding: '10px' }}>
                                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase',
                                                backgroundColor: tx.type === 'recharge' ? 'rgba(59,130,246,0.15)' : tx.type === 'refund' ? 'rgba(16,185,129,0.15)' : tx.type === 'referral_bonus' ? 'rgba(139,92,246,0.15)' : 'rgba(239,68,68,0.15)',
                                                color: tx.type === 'recharge' ? '#3b82f6' : tx.type === 'refund' ? '#10b981' : tx.type === 'referral_bonus' ? '#8b5cf6' : '#ef4444'
                                              }}>
                                                {tx.type.replace('_', ' ')}
                                              </span>
                                            </td>
                                            <td style={{ padding: '10px' }}>{tx.description}</td>
                                            <td style={{ padding: '10px', fontFamily: 'monospace', color: '#f59e0b' }}>{tx.utr || 'N/A'}</td>
                                            <td style={{ padding: '10px', fontWeight: 'bold', color: isPositive ? '#10b981' : '#ef4444' }}>
                                              {isPositive ? `+₹${tx.amount}` : `-₹${Math.abs(tx.amount)}`}
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase',
                                                backgroundColor: tx.status === 'approved' ? 'rgba(16,185,129,0.15)' : tx.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                                color: tx.status === 'approved' ? '#10b981' : tx.status === 'pending' ? '#f59e0b' : '#ef4444'
                                              }}>
                                                {tx.status || 'approved'}
                                              </span>
                                            </td>
                                            <td style={{ padding: '10px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                              {tx.created_at ? new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* TAB 8: System Activity Logs */}
        {activeTab === 'logs' && roleMode === 'owner' && (() => {
          const filteredLogs = activityLogs.filter(log => {
            if (logFilter === 'all') return true;
            if (logFilter === 'auth') return ['signup', 'login', 'profile_update'].includes(log.activityType);
            if (logFilter === 'orders') return ['order_placed', 'order_dispatched', 'order_delivered', 'poll_voted'].includes(log.activityType);
            if (logFilter === 'finance') return ['wallet_recharge_request', 'wallet_recharge_approved', 'wallet_recharge_rejected', 'referral_applied', 'admin_adjustment', 'plan_subscribed'].includes(log.activityType);
            return ['vacation_started', 'vacation_cancelled', 'meal_rated'].includes(log.activityType);
          });

          const getBadgeStyles = (type: string) => {
            const mappings: Record<string, { bg: string, color: string, icon: string }> = {
              signup: { bg: '#dcfce7', color: '#15803d', icon: '🆕' },
              login: { bg: '#e0f2fe', color: '#0369a1', icon: '🔑' },
              profile_update: { bg: '#f1f5f9', color: '#475569', icon: '👤' },
              referral_applied: { bg: '#faf5ff', color: '#7e22ce', icon: '🎁' },
              wallet_recharge_request: { bg: '#fef3c7', color: '#b45309', icon: '💳' },
              wallet_recharge_approved: { bg: '#dcfce7', color: '#15803d', icon: '✅' },
              wallet_recharge_rejected: { bg: '#fee2e2', color: '#b91c1c', icon: '❌' },
              plan_subscribed: { bg: '#e0e7ff', color: '#4338ca', icon: '👑' },
              order_placed: { bg: '#ffedd5', color: '#c2410c', icon: '🍛' },
              order_dispatched: { bg: '#f3e8ff', color: '#6b21a8', icon: '🛵' },
              order_delivered: { bg: '#dcfce7', color: '#15803d', icon: '📦' },
              vacation_started: { bg: '#fee2e2', color: '#b91c1c', icon: '🏖️' },
              vacation_cancelled: { bg: '#f1f5f9', color: '#475569', icon: '↩️' },
              meal_rated: { bg: '#fef9c3', color: '#a16207', icon: '⭐' },
              poll_voted: { bg: '#ecfdf5', color: '#047857', icon: '🗳️' },
              admin_adjustment: { bg: '#e0f2fe', color: '#0369a1', icon: '⚙️' }
            };
            return mappings[type] || { bg: '#f1f5f9', color: '#475569', icon: '📝' };
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>System Activity Logs</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Track live student signups, order transactions, referral rewards, and system logs in real-time.
                  </p>
                </div>
                <div style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#f97316', padding: '6px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f97316' }}></span>
                  <span>Live Feed Active</span>
                </div>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                {[
                  { id: 'all', label: '📋 All Logs' },
                  { id: 'auth', label: '👤 Auth & Profiles' },
                  { id: 'orders', label: '🍛 Orders & Polls' },
                  { id: 'finance', label: '💰 Wallet & Referrals' },
                  { id: 'other', label: '🏝️ Vacations & Ratings' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setLogFilter(f.id as any)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                      backgroundColor: logFilter === f.id ? '#f97316' : 'var(--bg-secondary)',
                      color: logFilter === f.id ? '#ffffff' : 'var(--text-primary)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Terminal Sheet */}
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px', fontFamily: 'monospace', color: '#94a3b8', maxHeight: '68vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }}>
                {filteredLogs.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: '#475569' }}>
                    &gt; No activity logs recorded for this category yet.
                  </div>
                ) : (
                  filteredLogs.map(log => {
                    const badge = getBadgeStyles(log.activityType);
                    const logDate = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    return (
                      <div key={log._id || log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '10px', fontSize: '13px', lineHeight: '20px' }}>
                        <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>[{logDate}]</span>
                        <span style={{
                          backgroundColor: badge.bg,
                          color: badge.color,
                          padding: '1px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap'
                        }}>
                          <span>{badge.icon}</span>
                          <span>{log.activityType.replace('_', ' ')}</span>
                        </span>
                        <span style={{ color: '#f8fafc', flex: 1 }}>{log.description}</span>
                        {log.user && (
                          <span style={{ color: '#38bdf8', fontSize: '12px' }}>
                            @{log.user.name || log.user.phone || 'student'}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

      {/* Active Subscribers Modal */}
      {showSubscribersModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', width: '640px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Active Plan Subscribers</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  List of students currently subscribed to basic, standard, or premium plans.
                </p>
              </div>
              <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                {profiles.filter(p => p.plan !== 'none').length} Active
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 16px' }}>Student</th>
                    <th style={{ padding: '12px 16px' }}>Plan</th>
                    <th style={{ padding: '12px 16px' }}>Phone</th>
                    <th style={{ padding: '12px 16px' }}>Wallet</th>
                    <th style={{ padding: '12px 16px' }}>Vacation?</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.filter(p => p.plan !== 'none').length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textStyle: 'italic', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No active subscriptions found.
                      </td>
                    </tr>
                  ) : (
                    profiles.filter(p => p.plan !== 'none').map((student: any) => {
                      const planColor = student.plan === 'premium' ? '#8B5CF6' : student.plan === 'standard' ? '#F97316' : '#3B82F6';
                      return (
                        <tr key={student._id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{student.name}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ textTransform: 'capitalize', fontSize: '11px', padding: '2px 8px', borderRadius: '8px', color: '#FFFFFF', backgroundColor: planColor, fontWeight: 600 }}>
                              {student.plan}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{student.phone || 'N/A'}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>₹{student.walletBalance}</td>
                          <td style={{ padding: '12px 16px' }}>
                            {student.isOnVacation ? (
                              <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444', fontWeight: 600 }}>
                                PAUSED 🏖️
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(34,197,94,0.15)', color: '#22C55E', fontWeight: 600 }}>
                                ACTIVE 🍜
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button 
                onClick={() => setShowSubscribersModal(false)}
                style={{ backgroundColor: 'var(--border)', border: 'none', color: 'var(--text-primary)', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Menu Item Modal */}
      {showItemModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', width: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {itemModalMode === 'add' ? '➕ Add New Dish' : '✏️ Edit Dish Details'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Fill in the details below to update the restaurant's menu.
              </p>
            </div>

            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Dish Name *</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Garlic Naan, Shahi Paneer"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Actual Price (₹) *</label>
                                                  <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    value={itemPrice}
                                                    onChange={(e) => setItemPrice(e.target.value)}
                                                    placeholder="e.g. 120"
                                                    style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                                                  />
                                                </div>

                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Original Price (₹ - Optional)</label>
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    value={itemOriginalPrice}
                                                    onChange={(e) => setItemOriginalPrice(e.target.value)}
                                                    placeholder="e.g. 150"
                                                    style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                                                  />
                                                </div>
                                              </div>

                                              <div style={{ display: 'flex', gap: '16px' }}>
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Food Category</label>
                                                  <select
                                                    value={itemIsVeg ? 'veg' : 'non-veg'}
                                                    onChange={(e) => setItemIsVeg(e.target.value === 'veg')}
                                                    style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none', height: '40px' }}
                                                  >
                                                    <option value="veg">🟢 Veg</option>
                                                    <option value="non-veg">🔴 Non-Veg</option>
                                                  </select>
                                                </div>

                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
                                                  {itemOriginalPrice && Number(itemOriginalPrice) > Number(itemPrice) ? (
                                                    <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 'bold', marginTop: '16px' }}>
                                                      🏷️ Discount: {Math.round(((Number(itemOriginalPrice) - Number(itemPrice)) / Number(itemOriginalPrice)) * 100)}% OFF
                                                    </span>
                                                  ) : null}
                                                </div>
                                              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Menu Section / Category</label>
                <input
                  type="text"
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  readOnly={isCategoryLocked}
                  placeholder="e.g. Starters, Main Course, Drinks (Default: Popular Dishes)"
                  style={{
                    backgroundColor: isCategoryLocked ? 'rgba(128,128,128,0.1)' : 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    color: isCategoryLocked ? 'var(--text-secondary)' : 'var(--text-primary)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: isCategoryLocked ? 'not-allowed' : 'text'
                  }}
                />
                {isCategoryLocked && (
                  <span style={{ fontSize: '11px', color: '#f97316', marginTop: '2px' }}>
                    🔒 Category locked to "{itemCategory}".
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
                <textarea
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="e.g. Rich creamy curry loaded with fresh paneer blocks."
                  rows={3}
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Image URL (Optional)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={itemImage}
                    onChange={(e) => setItemImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    style={{ flex: 1, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  />
                  <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      style={{ backgroundColor: '#f97316', border: 'none', color: '#ffffff', padding: '10px 16px', borderRadius: '8px', cursor: isUploadingImage ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                      {isUploadingImage ? '⌛ Uploading...' : '📁 Upload File'}
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingImage}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, setItemImage);
                      }}
                      style={{ position: 'absolute', fontSize: '100px', opacity: 0, right: 0, top: 0, cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="modal-available"
                  checked={itemIsAvailable}
                  onChange={(e) => setItemIsAvailable(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="modal-available" style={{ fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>
                  In Stock (Available for ordering)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  style={{ backgroundColor: 'var(--border)', border: 'none', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#f97316', border: 'none', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Restaurant Modal */}
      {showRestaurantModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', width: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                ➕ Create New Section / Restaurant
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Define a brand-new restaurant section that students can order from.
              </p>
            </div>

            <form onSubmit={handleCreateRestaurant} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Section / Restaurant Name *</label>
                <input
                  type="text"
                  required
                  value={newRestName}
                  onChange={(e) => setNewRestName(e.target.value)}
                  placeholder="e.g. Drinks Hub, Pizza Palace"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Cuisine Type *</label>
                <input
                  type="text"
                  required
                  value={newRestCuisine}
                  onChange={(e) => setNewRestCuisine(e.target.value)}
                  placeholder="e.g. Beverages, Fast Food, Desserts"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Estimated Delivery Time</label>
                <input
                  type="text"
                  value={newRestDeliveryTime}
                  onChange={(e) => setNewRestDeliveryTime(e.target.value)}
                  placeholder="e.g. 20-30 mins"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Image URL (Optional)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={newRestImage}
                    onChange={(e) => setNewRestImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    style={{ flex: 1, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  />
                  <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      style={{ backgroundColor: '#f97316', border: 'none', color: '#ffffff', padding: '10px 16px', borderRadius: '8px', cursor: isUploadingImage ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                      {isUploadingImage ? '⌛ Uploading...' : '📁 Upload File'}
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingImage}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, setNewRestImage);
                      }}
                      style={{ position: 'absolute', fontSize: '100px', opacity: 0, right: 0, top: 0, cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowRestaurantModal(false)}
                  style={{ backgroundColor: 'var(--border)', border: 'none', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#f97316', border: 'none', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                >
                  Create Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

          </>
        )}

      </main>
    </div>
  );
}

interface RidersManagementViewProps {
  profiles: any[];
  orders: any[];
  loadAllData: () => void;
}

const RidersManagementView: React.FC<RidersManagementViewProps> = ({ profiles, orders, loadAllData }) => {
  const ridersList = profiles.filter(p => p.role === 'rider');
  
  // Stats
  const totalRiders = ridersList.length;
  const onlineRiders = ridersList.filter(r => r.isOnline !== false).length;
  
  // Calculate total deliveries handled by riders today
  const tiffinDeliveriesToday = orders.filter(o => o.isTiffinOrder && o.status === 'delivered').length;
  const restaurantDeliveriesToday = orders.filter(o => o.restaurant && o.status === 'delivered').length;
  const totalDeliveriesToday = tiffinDeliveriesToday + restaurantDeliveriesToday;

  // State for creating new rider
  const [showAddRider, setShowAddRider] = useState(false);
  const [newRiderName, setNewRiderName] = useState('');
  const [newRiderPhone, setNewRiderPhone] = useState('');
  const [newRiderEmail, setNewRiderEmail] = useState('');
  const [newRiderPassword, setNewRiderPassword] = useState('');
  const [newRiderVehicle, setNewRiderVehicle] = useState('');
  const [newRiderPin, setNewRiderPin] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for editing rider
  const [editingRiderId, setEditingRiderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editVehicle, setEditVehicle] = useState('');
  const [editPin, setEditPin] = useState('');

  const handleAddRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiderName || !newRiderPassword) {
      setFormError('Name and Password are required');
      return;
    }
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);
    try {
      const { data } = await api.post('/admin/users', {
        name: newRiderName,
        phone: newRiderPhone || undefined,
        email: newRiderEmail || undefined,
        password: newRiderPassword,
        role: 'rider',
        vehicle: newRiderVehicle,
        riderPin: newRiderPin
      });
      if (data.success) {
        setFormSuccess('Rider created successfully!');
        setNewRiderName('');
        setNewRiderPhone('');
        setNewRiderEmail('');
        setNewRiderPassword('');
        setNewRiderVehicle('');
        setNewRiderPin('');
        loadAllData();
        setTimeout(() => setShowAddRider(false), 1500);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create rider');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleOnlineStatus = async (riderId: string, currentStatus: boolean) => {
    try {
      const { data } = await api.put(`/admin/users/${riderId}`, {
        isOnline: !currentStatus
      });
      if (data.success) {
        loadAllData();
      }
    } catch (err) {
      console.error('Failed to toggle online status:', err);
    }
  };

  const handleSaveEdit = async (riderId: string) => {
    try {
      const { data } = await api.put(`/admin/users/${riderId}`, {
        name: editName,
        phone: editPhone,
        vehicle: editVehicle,
        riderPin: editPin
      });
      if (data.success) {
        setEditingRiderId(null);
        loadAllData();
      }
    } catch (err) {
      console.error('Failed to update rider:', err);
    }
  };

  const startEditing = (rider: any) => {
    setEditingRiderId(rider._id || rider.id);
    setEditName(rider.name);
    setEditPhone(rider.phone || '');
    setEditVehicle(rider.vehicle || '');
    setEditPin(rider.riderPin || '');
  };

  const handleDeleteRider = async (riderId: string) => {
    if (!window.confirm('Are you sure you want to remove this rider?')) return;
    try {
      const { data } = await api.delete(`/admin/users/${riderId}`);
      if (data.success) {
        loadAllData();
      }
    } catch (err) {
      console.error('Failed to delete rider:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header and Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>🛵 Riders Section & Management</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Register new delivery personnel, track status, edit vehicle numbers, and verify pins.
          </p>
        </div>
        <button
          onClick={() => setShowAddRider(!showAddRider)}
          style={{
            backgroundColor: '#f97316',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {showAddRider ? '✕ Close Form' : '➕ Register New Rider'}
        </button>
      </div>

      {/* Add Rider Form Section */}
      {showAddRider && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', maxWidth: '600px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>📝 Register New Rider Profile</h3>
          {formError && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>⚠️ {formError}</p>}
          {formSuccess && <p style={{ color: '#10b981', fontSize: '13px', marginBottom: '12px' }}>✓ {formSuccess}</p>}
          
          <form onSubmit={handleAddRider} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={newRiderName}
                  onChange={(e) => setNewRiderName(e.target.value)}
                  placeholder="Rider's full name"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Password *</label>
                <input
                  type="password"
                  required
                  value={newRiderPassword}
                  onChange={(e) => setNewRiderPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Phone Number</label>
                <input
                  type="text"
                  value={newRiderPhone}
                  onChange={(e) => setNewRiderPhone(e.target.value)}
                  placeholder="+91 9988776655"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Email (Username)</label>
                <input
                  type="email"
                  value={newRiderEmail}
                  onChange={(e) => setNewRiderEmail(e.target.value)}
                  placeholder="rider@tiffin.com"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Vehicle Number</label>
                <input
                  type="text"
                  value={newRiderVehicle}
                  onChange={(e) => setNewRiderVehicle(e.target.value)}
                  placeholder="e.g. MP 09 AB 1234"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Rider Pin (Delivery Check)</label>
                <input
                  type="text"
                  value={newRiderPin}
                  onChange={(e) => setNewRiderPin(e.target.value)}
                  placeholder="e.g. 4321"
                  maxLength={6}
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px', opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? 'Creating Rider Account...' : '✓ Create Rider Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Stats Counter Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Registered Riders</span>
          <h3 style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0 0 0', color: 'var(--primary)' }}>{totalRiders}</h3>
        </div>
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Online & Active Riders</span>
          <h3 style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#10b981' }}>{onlineRiders}</h3>
        </div>
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Deliveries Handled (Today)</span>
          <h3 style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#3b82f6' }}>{totalDeliveriesToday}</h3>
        </div>
      </div>

      {/* Grid of Riders */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>👥 Active Fleet List</h3>
        
        {ridersList.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No riders registered yet. Use the form above to add some!</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {ridersList.map((rider) => {
              const id = rider._id || rider.id;
              const isEditing = editingRiderId === id;
              const isOnline = rider.isOnline !== false;

              return (
                <div key={id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Status Indicator */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isOnline ? '#10b981' : '#6b7280' }} />
                      <span style={{ fontSize: '12px', fontWeight: 500, color: isOnline ? '#10b981' : 'var(--text-secondary)' }}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleOnlineStatus(id, isOnline)}
                      style={{
                        backgroundColor: isOnline ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        color: isOnline ? '#ef4444' : '#10b981',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {isOnline ? 'Go Offline' : 'Go Online'}
                    </button>
                  </div>

                  {/* Rider Details */}
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Rider Name"
                        style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 8px', borderRadius: '6px', fontSize: '13px' }}
                      />
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Rider Phone"
                        style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 8px', borderRadius: '6px', fontSize: '13px' }}
                      />
                      <input
                        type="text"
                        value={editVehicle}
                        onChange={(e) => setEditVehicle(e.target.value)}
                        placeholder="Vehicle Number"
                        style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 8px', borderRadius: '6px', fontSize: '13px' }}
                      />
                      <input
                        type="text"
                        value={editPin}
                        onChange={(e) => setEditPin(e.target.value)}
                        placeholder="Confirmation PIN"
                        style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 8px', borderRadius: '6px', fontSize: '13px' }}
                      />

                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button onClick={() => handleSaveEdit(id)} style={{ flex: 1, backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingRiderId(null)} style={{ flex: 1, backgroundColor: 'var(--border)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', padding: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>🧑‍🦱 {rider.name}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>📞 {rider.phone || 'No phone added'}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>✉ {rider.email || 'No email'}</p>
                      
                      <div style={{ marginTop: '8px', display: 'flex', gap: '12px', fontSize: '12px', padding: '8px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Vehicle:</span> <span style={{ fontWeight: 600 }}>🛵 {rider.vehicle || 'N/A'}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>PIN Code:</span> <span style={{ fontWeight: 600 }}>🔑 {rider.riderPin || 'N/A'}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button
                          onClick={() => startEditing(rider)}
                          style={{ flex: 1, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px', padding: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          ✎ Edit Info
                        </button>
                        <button
                          onClick={() => handleDeleteRider(id)}
                          style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          🗑 Remove
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <DashboardApp />
    </Router>
  );
}
