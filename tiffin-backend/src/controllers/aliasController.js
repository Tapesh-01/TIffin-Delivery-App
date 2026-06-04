const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

// @desc    Get all products (menu items)
// @route   GET /products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    let allProducts = [];
    restaurants.forEach(r => {
      if (r.menuItems) {
        r.menuItems.forEach(item => {
          allProducts.push({
            id: item._id,
            restaurantId: r._id,
            restaurantName: r.name,
            name: item.name,
            price: item.price,
            description: item.description || '',
            image: item.image || '',
            isVeg: item.isVeg
          });
        });
      }
    });
    res.json({ success: true, count: allProducts.length, data: allProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Track order details by ID
// @route   GET /track-order/:id
// @access  Public
exports.trackOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name phone addressLine plan')
      .populate('restaurant', 'name cuisine image')
      .populate('rider', 'name phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Rider live GPS location via REST API
// @route   POST /update-location
// @access  Private/Rider
exports.updateRiderLocation = async (req, res) => {
  const { orderId, latitude, longitude, riderName } = req.body;
  if (!orderId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, message: 'OrderId, latitude, and longitude are required' });
  }

  try {
    // 1. If rider field needs assigning, update order doc
    const order = await Order.findById(orderId);
    if (order && req.user && req.user.role === 'rider') {
      order.rider = req.user.id;
      await order.save();
    }

    // 2. Broadcast via socket to students & admins for real-time visual tracking
    const io = req.app.get('io');
    if (io) {
      io.to(orderId).emit('rider_location_changed', { latitude, longitude });
      io.to('admins').emit('all_rider_locations', {
        orderId,
        riderId: req.user?.id || orderId,
        riderName: riderName || req.user?.name || 'R Ramesh Rider',
        latitude,
        longitude
      });
    }

    res.json({
      success: true,
      message: 'Location broadcasted successfully',
      location: { latitude, longitude }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
