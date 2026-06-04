require('dotenv').config({ override: true });
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const riderRoutes = require('./routes/riderRoutes');
const vacationRatingRoutes = require('./routes/vacationRatingRoutes');
const aliasRoutes = require('./routes/aliasRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const pollRoutes = require('./routes/pollRoutes');

// Connect to Database
connectDB();

// Initialize Firebase Admin
require('./config/firebase');

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors());

// Body parser
app.use(express.json());

// Request Logger (Prints HTTP requests in the terminal in real-time)
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Set up Socket.io server
const io = socketio(server, {
  cors: {
    origin: '*', // Allow all origins for the React Native/React client
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Share io instance with Express app
app.set('io', io);

// Socket.io Events Setup
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // 1. Join room based on user role or user ID
  socket.on('join', (data) => {
    const { userId, role } = data;
    if (userId) {
      socket.join(userId);
      console.log(`👤 User joined room: ${userId}`);
    }
    if (role === 'admin') {
      socket.join('admins');
      console.log('👑 Admin joined room: admins');
    }
    if (role === 'rider') {
      socket.join('riders');
      console.log('🛵 Rider joined room: riders');
    }
  });

  // 2. Rider location updates (for live tracking)
  socket.on('update_rider_location', async (data) => {
    const { orderId, latitude, longitude, riderId, riderName } = data;
    console.log(`🛵 Rider location updated for Order ${orderId}:`, { latitude, longitude });
    
    // Broadcast to the user tracking this order
    io.to(orderId).emit('rider_location_changed', { latitude, longitude });
    
    // Broadcast to admins
    io.to('admins').emit('all_rider_locations', {
      orderId,
      riderId: riderId || data.orderId,
      riderName: riderName || 'Ramesh Rider',
      riderVehicle: data.vehicle || '',
      latitude,
      longitude
    });

    // Update order rider field in DB if needed
    try {
      if (orderId && riderId) {
        const Order = require('./models/Order');
        const order = await Order.findById(orderId);
        if (order && String(order.rider) !== String(riderId)) {
          order.rider = riderId;
          await order.save();
          console.log(`✅ Assigned Rider ${riderId} to Order ${orderId} in DB`);
          
          // Also emit status update so student app knows rider detail is updated
          const populatedOrder = await Order.findById(orderId)
            .populate('user', 'name email role plan')
            .populate('restaurant', 'name cuisine image')
            .populate('rider', 'name phone');
          
          if (populatedOrder) {
            io.to(order.user.toString()).emit('order_status_updated', populatedOrder);
            io.to('admins').emit('order_status_updated', populatedOrder);
          }
        }
      }
    } catch (err) {
      console.error('Failed to update rider for order via socket:', err);
    }
  });

  // 3. Join custom order room for tracking
  socket.on('join_order_room', (orderId) => {
    socket.join(orderId);
    console.log(`📦 Client joined order room: ${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api', restaurantRoutes);
app.use('/api', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', riderRoutes);
app.use('/api', vacationRatingRoutes);
app.use('/api', aliasRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', pollRoutes);
app.use('/', aliasRoutes);

// Simple base route
app.get('/', (req, res) => {
  res.send('🍜 My Tiffin API Server is running...');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🔥 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
