require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const Order = require('./models/Order');

const checkOrders = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const orders = await Order.find().populate('user', 'name email role plan');
    console.log(`Found ${orders.length} orders:`);
    orders.forEach(o => {
      console.log(`- ID: ${o._id}, User: ${o.user?.name || 'N/A'}, Plan: ${o.user?.plan || 'none'}, Total: ₹${o.totalAmount}, Method: ${o.paymentMethod}, Status: ${o.status}, isTiffin: ${o.isTiffinOrder}, CreatedAt: ${o.createdAt}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

checkOrders();
