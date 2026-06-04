const Order = require('../models/Order');
const User = require('../models/User');

// @desc    Get active delivery orders for riders
// @route   GET /api/rider/orders
// @access  Private
exports.getRiderOrders = async (req, res) => {
  try {
    // Return orders that are out for delivery, or recently delivered
    const orders = await Order.find({ 
      status: { $in: ['out_for_delivery', 'delivered'] } 
    })
    .populate('user', 'name phone addressLine city state pincode plan latitude longitude')
    .populate('restaurant', 'name cuisine image')
    .sort({ createdAt: -1 });

    // Map DB schema to match the frontend expectations if needed
    const mappedOrders = orders.map(order => {
      const orderJson = order.toJSON();
      orderJson.id = orderJson._id;
      // Ensure frontend profiles property maps properly
      if (orderJson.user) {
        orderJson.profiles = {
          name: orderJson.user.name,
          phone: orderJson.user.phone,
          address_hostel: orderJson.user.addressLine,
          address_room: `${orderJson.user.city || ''} ${orderJson.user.pincode || ''}`,
          latitude: orderJson.user.latitude,
          longitude: orderJson.user.longitude
        };
        orderJson.plan_type = orderJson.user.plan || 'basic';
      }
      return orderJson;
    });

    res.json({ success: true, count: mappedOrders.length, data: mappedOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle rider online/offline status
// @route   PUT /api/rider/status
// @access  Private
exports.toggleRiderStatus = async (req, res) => {
  const { isOnline } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    user.isOnline = isOnline;
    await user.save();

    // Emit live status change to socket admins
    if (req.app.get('io')) {
      req.app.get('io').to('admins').emit('rider_status_changed', {
        riderId: user._id,
        isOnline: user.isOnline
      });
    }

    res.json({ success: true, isOnline: user.isOnline });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get rider earnings details
// @route   GET /api/rider/earnings
// @access  Private
exports.getRiderEarnings = async (req, res) => {
  try {
    // Find all completed orders delivered by this rider
    const completedOrders = await Order.find({
      rider: req.user.id,
      status: 'delivered'
    }).populate('user', 'addressLine').sort({ createdAt: -1 });

    const baseFeePerDelivery = 40;
    const totalEarnings = completedOrders.length * baseFeePerDelivery;

    const trips = completedOrders.map(order => ({
      id: order._id,
      amount: baseFeePerDelivery,
      date: order.createdAt,
      address: order.user ? order.user.addressLine : 'Hostel Delivery'
    }));

    res.json({
      success: true,
      todayEarnings: totalEarnings,
      tripsCount: completedOrders.length,
      trips
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
