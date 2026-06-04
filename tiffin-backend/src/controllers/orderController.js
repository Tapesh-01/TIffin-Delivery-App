const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Transaction = require('../models/Transaction');
const { logActivity } = require('../utils/activityLogger');
const { sendPushNotification } = require('../utils/pushNotifications');

// @desc    Place a new order (Tiffin or Restaurant)
// @route   POST /api/orders/place
// @access  Private
exports.placeOrder = async (req, res) => {
  const { 
    restaurantId, 
    items, 
    totalAmount, 
    paymentMethod, 
    utrCode,
    isTiffinOrder 
  } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Validation for Restaurant Orders (check availability)
    if (!isTiffinOrder && restaurantId) {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ success: false, message: 'Restaurant not found' });
      }

      for (const item of (items || [])) {
        const itemId = item.id || item._id;
        let dbItem;
        if (itemId) {
          dbItem = restaurant.menuItems.id(itemId);
        } else {
          dbItem = restaurant.menuItems.find(m => m.name === item.name);
        }

        if (!dbItem) {
          return res.status(400).json({ success: false, message: `Menu item '${item.name}' not found in restaurant` });
        }
        if (dbItem.isAvailable === false) {
          return res.status(400).json({ success: false, message: `Dish '${dbItem.name}' is temporarily out of stock / sold out!` });
        }
      }
    }

    const normalizedMethod = paymentMethod ? paymentMethod.toLowerCase() : 'cod';

    // 1. Handle Wallet Payment
    if (normalizedMethod === 'wallet') {
      if (user.walletBalance < totalAmount) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }

      // Deduct balance
      user.walletBalance -= totalAmount;
      await user.save();

      // Log wallet transaction
      await Transaction.create({
        user: user._id,
        amount: -totalAmount,
        type: isTiffinOrder ? 'tiffin_deduction' : 'restaurant_order',
        description: isTiffinOrder 
          ? 'Tiffin subscription day deduction' 
          : `Paid for order at restaurant`,
        status: 'approved'
      });

      // Emit live wallet update to the student's room
      const io = req.app.get('io');
      if (io) {
        io.to(user._id.toString()).emit('wallet_updated', user.walletBalance);
      }
    }

    // 2. Create the Order
    const order = await Order.create({
      user: user._id,
      restaurant: restaurantId || null,
      isTiffinOrder: !!isTiffinOrder,
      items,
      totalAmount,
      paymentMethod: normalizedMethod,
      paymentStatus: normalizedMethod === 'wallet' ? 'approved' : 'pending',
      utrCode: normalizedMethod === 'upi' ? utrCode : undefined,
      status: 'pending',
      addons: req.body.addons || [],
      latitude: req.body.latitude || null,
      longitude: req.body.longitude || null
    });

    // 3. For UPI/COD, create a pending transaction log
    if (normalizedMethod !== 'wallet') {
      await Transaction.create({
        user: user._id,
        amount: -totalAmount,
        type: isTiffinOrder ? 'tiffin_deduction' : 'restaurant_order',
        description: `Order via ${normalizedMethod.toUpperCase()}${utrCode ? ' (UTR: ' + utrCode + ')' : ''}`,
        status: normalizedMethod === 'cod' ? 'pending_cash' : 'pending',
        utr: utrCode || (normalizedMethod === 'cod' ? 'COD_COLLECT' : undefined)
      });
    }

    // Get populated order to return
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email role plan pushToken')
      .populate('restaurant', 'name cuisine image latitude longitude');

    // Notify Sockets (Handled in server.js via io instance)
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to('admins').emit('new_order', populatedOrder);
    }

    await logActivity(
      req.app, 
      user._id, 
      'order_placed', 
      `Placed order #${order._id.toString().substring(0, 8)} at ${populatedOrder.restaurant?.name || 'Kitchen'} (Total: ₹${totalAmount} via ${paymentMethod.toUpperCase()})`
    );

    res.status(201).json({ success: true, data: populatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('restaurant', 'name cuisine image latitude longitude')
      .populate('rider', 'name phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email plan')
      .populate('restaurant', 'name cuisine image')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
exports.updateOrderStatus = async (req, res) => {
  const { status } = req.body;

  try {
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    if (req.body.emptyTiffinCollected !== undefined) {
      order.emptyTiffinCollected = req.body.emptyTiffinCollected;
    }
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email role plan pushToken')
      .populate('restaurant', 'name cuisine image latitude longitude')
      .populate('rider', 'name phone');

    // Emit live update event to student and admins
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(order.user.toString()).emit('order_status_updated', populatedOrder);
      io.to('admins').emit('order_status_updated', populatedOrder);
    }

    // Trigger Mobile Push Notification (Zomato/Swiggy style lock screen alert)
    if (populatedOrder.user && populatedOrder.user.pushToken) {
      let title = "Tiffin Order Update 🍱";
      let body = `Aapke order ka status abhi: ${status} hai.`;

      if (status === 'cooking') {
        title = "Order Accepted! 👨‍🍳";
        body = `Aapka tiffin order accept ho gaya hai! Kitchen me fresh preparation shuru ho gayi hai.`;
      } else if (status === 'packed') {
        title = "Tiffin Packed! 📦";
        body = `Aapka tiffin pack ho chuka hai aur dispatch hone ke liye bilkul tayyar hai.`;
      } else if (status === 'out_for_delivery') {
        title = "Tiffin Dispatched! 🛵";
        const riderName = populatedOrder.rider ? populatedOrder.rider.name : 'Rider';
        body = `Aapka tiffin kitchen se dispatch ho gaya hai! Rider ${riderName} aapke hostel ki taraf nikal chuka hai.`;
      } else if (status === 'delivered') {
        title = "Tiffin Delivered! 🎉";
        body = `Aapka tiffin safely deliver ho gaya hai. Garma-garam khaane ka lutf uthayein!`;
      }

      sendPushNotification(populatedOrder.user.pushToken, title, body, {
        orderId: populatedOrder._id.toString(),
        status
      }).catch(err => console.error("Error sending push notification:", err));
    }

    if (status === 'out_for_delivery') {
      await logActivity(req.app, order.user, 'order_dispatched', `Order #${order._id.toString().substring(0, 8)} is dispatched and out for delivery.`);
    } else if (status === 'delivered') {
      await logActivity(req.app, order.user, 'order_delivered', `Order #${order._id.toString().substring(0, 8)} has been marked delivered.`);
    }

    res.json({ success: true, data: populatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Recharge Wallet Balance
// @route   POST /api/wallet/recharge
// @access  Private
exports.rechargeWallet = async (req, res) => {
  const { amount, utrCode } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Create a pending transaction for admin verification instead of auto-approving
    const transaction = await Transaction.create({
      user: user._id,
      amount: parseFloat(amount),
      type: 'recharge',
      description: `Wallet recharge via UPI (UTR: ${utrCode})`,
      status: 'pending',
      utr: utrCode
    });

    // Notify admins in real-time about the pending transaction
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('new_transaction', transaction);
    }

    await logActivity(req.app, user._id, 'wallet_recharge_request', `Requested wallet recharge of ₹${amount} (UTR: ${utrCode})`);

    res.json({ 
      success: true, 
      walletBalance: user.walletBalance,
      message: 'Recharge request submitted. Pending admin approval.',
      transaction 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user transactions history
// @route   GET /api/wallet/transactions
// @access  Private
exports.getMyTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
