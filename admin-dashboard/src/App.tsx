import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { api } from './lib/api';
import { socket } from './lib/socket';
import './App.css';

// Import modular subcomponents
import { HeaderNavbar } from './components/HeaderNavbar';
import { KitchenOverview } from './components/KitchenOverview';
import { FleetTracking } from './components/FleetTracking';
import { MenuManagement } from './components/MenuManagement';
import { RestaurantMenuEditor } from './components/RestaurantMenuEditor';
import { RidersManagementView } from './components/RidersManagementView';
import { FinanceAnalytics } from './components/FinanceAnalytics';
import { ReviewsList } from './components/ReviewsList';
import { SystemLogsView } from './components/SystemLogsView';
import { CrmConsole } from './components/CrmConsole';

// Mock data for Offline Demo Mode fallbacks
const MOCK_PROFILES = [
  { id: 'u1', name: 'Rahul Student', email: 'student@tiffin.com', phone: '9876543210', plan: 'standard', walletBalance: 1500, streak: 5, address_hostel: 'BH-3', address_room: '204' }
];

const MOCK_ORDERS: any[] = [];



const MOCK_TRANSACTIONS: any[] = [];

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
  const [transactions, setTransactions] = useState<any[]>(MOCK_TRANSACTIONS);
  const [vacationRequests, setVacationRequests] = useState<any[]>([]);
  const [mealRatings, setMealRatings] = useState<any[]>([]);
  const [mealRatingsAvg, setMealRatingsAvg] = useState<number>(0);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
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
      const dayOrders = allOrders.filter(o => {
        const orderDate = new Date(o.createdAt || o.delivery_date).toISOString().split('T')[0];
        return orderDate === dateStr && o.status === 'delivered';
      });
      const dayRevenue = dayOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
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

      {/* Top Header Navbar */}
      <HeaderNavbar
        currentUser={currentUser}
        roleMode={roleMode}
        handleRoleChange={handleRoleChange}
        handleGenerateTiffins={handleGenerateTiffins}
        isGeneratingTiffins={isGeneratingTiffins}
        loadAllData={loadAllData}
        isLoading={isLoading}
        toggleTheme={toggleTheme}
        theme={theme}
        handleLogout={handleLogout}
        activeTab={activeTab}
        navigate={navigate}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="shimmer-block" style={{ width: '220px', height: '36px' }}></div>
              <div className="shimmer-block" style={{ width: '120px', height: '24px' }}></div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="shimmer-block" style={{ width: '40%', height: '14px' }}></div>
                  <div className="shimmer-block" style={{ width: '80%', height: '36px' }}></div>
                  <div className="shimmer-block" style={{ width: '60%', height: '12px' }}></div>
                </div>
              ))}
            </div>

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
            {activeTab === 'dashboard' && roleMode !== 'support' && (
              <KitchenOverview
                todayRevenue={todayRevenue}
                todayCashInflow={todayCashInflow}
                allTimeRevenue={allTimeRevenue}
                allTimeCashInflow={allTimeCashInflow}
                profiles={profiles}
                orders={orders}
                basicCount={basicCount}
                standardCount={standardCount}
                premiumCount={premiumCount}
                totalMealCount={totalMealCount}
                rawRice={Number(rawRice)}
                rawAtta={Number(rawAtta)}
                rawPaneer={Number(rawPaneer)}
                extraRotiCount={extraRotiCount}
                curdCount={curdCount}
                jamunCount={jamunCount}
                saladCount={saladCount}
                todayAddonOrdersCount={todayAddonOrdersCount}
                todayAddonRevenue={todayAddonRevenue}
                lastUpdatedTime={lastUpdatedTime}
                activityLogs={activityLogs}
                transactions={transactions}
                chartActive={chartActive}
                setShowSubscribersModal={setShowSubscribersModal}
                handleDispatch={handleDispatch}
                handleRejectTransaction={handleRejectTransaction}
                handleApproveTransaction={handleApproveTransaction}
                loadAllData={loadAllData}
              />
            )}

            {activeTab === 'fleet' && roleMode !== 'support' && (
              <FleetTracking
                orders={orders}
                loadAllData={loadAllData}
                dispatchedOrderId={dispatchedOrderId}
                handleDispatch={handleDispatch}
                riderPosition={riderPosition}
                deliveryProgress={deliveryProgress}
                liveRiders={liveRiders}
              />
            )}

            {activeTab === 'menu' && roleMode !== 'support' && (
              <MenuManagement
                weeklyMenu={weeklyMenu}
                handleMenuChange={handleMenuChange}
                saveMenuDay={saveMenuDay}
              />
            )}

            {activeTab === 'restaurant-menu' && roleMode !== 'support' && (
              <RestaurantMenuEditor
                restaurants={restaurants}
                customCategories={customCategories}
                setCustomCategories={setCustomCategories}
                setShowRestaurantModal={setShowRestaurantModal}
                handleDeleteRestaurant={handleDeleteRestaurant}
                openAddItemModal={openAddItemModal}
                openEditItemModal={openEditItemModal}
                handleDeleteItem={handleDeleteItem}
                toggleItemAvailability={toggleItemAvailability}
              />
            )}

            {activeTab === 'riders-mgmt' && roleMode !== 'support' && (
              <RidersManagementView
                profiles={profiles}
                orders={orders}
                loadAllData={loadAllData}
              />
            )}

            {activeTab === 'crm' && roleMode !== 'kitchen' && (
              <CrmConsole
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredStudents={filteredStudents}
                filteredRiders={filteredRiders}
                allOrders={allOrders}
                setProfiles={setProfiles}
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
                refundAmount={refundAmount}
                setRefundAmount={setRefundAmount}
                refundReason={refundReason}
                setRefundReason={setRefundReason}
                handleRefundSubmit={handleRefundSubmit}
              />
            )}

            {activeTab === 'finance' && roleMode === 'owner' && (
              <FinanceAnalytics
                transactions={transactions}
                profiles={profiles}
                allOrders={allOrders}
                todayRevenue={todayRevenue}
                todayCashInflow={todayCashInflow}
                allTimeRevenue={allTimeRevenue}
                allTimeCashInflow={allTimeCashInflow}
                getRevenueForLast7Days={getRevenueForLast7Days}
              />
            )}

            {activeTab === 'reviews' && roleMode !== 'kitchen' && (
              <ReviewsList
                mealRatingsAvg={mealRatingsAvg}
                mealRatings={mealRatings}
                vacationRequests={vacationRequests}
                setVacationRequests={setVacationRequests}
                activePoll={activePoll}
                pollQuestion={pollQuestion}
                setPollQuestion={setPollQuestion}
                pollOptionA={pollOptionA}
                setPollOptionA={setPollOptionA}
                pollOptionB={pollOptionB}
                setPollOptionB={setPollOptionB}
                handleCreatePoll={handleCreatePoll}
              />
            )}

            {activeTab === 'logs' && roleMode === 'owner' && (
              <SystemLogsView
                activityLogs={activityLogs}
              />
            )}
          </>
        )}
      </main>

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
                      <td colSpan={5} style={{ padding: '24px', fontStyle: 'italic', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No active subscriptions found.
                      </td>
                    </tr>
                  ) : (
                    profiles.filter(p => p.plan !== 'none').map((student: any) => {
                      const planColor = student.plan === 'premium' ? '#8B5CF6' : student.plan === 'standard' ? '#F97316' : '#3B82F6';
                      return (
                        <tr key={student._id || student.id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{student.name}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ textTransform: 'capitalize', fontSize: '11px', padding: '2px 8px', borderRadius: '8px', color: '#FFFFFF', backgroundColor: planColor, fontWeight: 600 }}>
                              {student.plan}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{student.phone || 'N/A'}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>
                            ₹{student.walletBalance ?? student.wallet_balance ?? student.wallet_use ?? 0}
                          </td>
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

    </div>
  );
}

export default function App() {
  return (
    <Router>
      <DashboardApp />
    </Router>
  );
}
