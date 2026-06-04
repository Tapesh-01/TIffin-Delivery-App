const Restaurant = require('../models/Restaurant');
const Menu = require('../models/Menu');
const ProductReview = require('../models/ProductReview');
const User = require('../models/User');

// @desc    Get all restaurants
// @route   GET /api/restaurants
// @access  Public
exports.getRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    
    // Fetch all product reviews for these restaurants
    const restaurantIds = restaurants.map(r => r._id);
    const reviews = await ProductReview.find({ restaurant: { $in: restaurantIds } });

    // Group reviews by restaurant ID and item ID
    const reviewMap = {};
    reviews.forEach(rev => {
      const key = `${rev.restaurant}_${rev.itemId}`;
      if (!reviewMap[key]) {
        reviewMap[key] = { sum: 0, count: 0 };
      }
      reviewMap[key].sum += rev.rating;
      reviewMap[key].count += 1;
    });

    // Map menu items to include ratings
    const data = restaurants.map(r => {
      const jsonRes = r.toJSON();
      jsonRes.menuItems = (jsonRes.menuItems || []).map(item => {
        const key = `${r._id}_${item._id}`;
        const stats = reviewMap[key];
        return {
          ...item,
          avgRating: stats ? parseFloat((stats.sum / stats.count).toFixed(1)) : 0,
          ratingCount: stats ? stats.count : 0
        };
      });
      return jsonRes;
    });

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single restaurant
// @route   GET /api/restaurants/:id
// @access  Public
exports.getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const reviews = await ProductReview.find({ restaurant: restaurant._id });
    const reviewMap = {};
    reviews.forEach(rev => {
      if (!reviewMap[rev.itemId]) {
        reviewMap[rev.itemId] = { sum: 0, count: 0 };
      }
      reviewMap[rev.itemId].sum += rev.rating;
      reviewMap[rev.itemId].count += 1;
    });

    const jsonRes = restaurant.toJSON();
    jsonRes.menuItems = (jsonRes.menuItems || []).map(item => {
      const stats = reviewMap[item._id];
      return {
        ...item,
        avgRating: stats ? parseFloat((stats.sum / stats.count).toFixed(1)) : 0,
        ratingCount: stats ? stats.count : 0
      };
    });

    res.json({ success: true, data: jsonRes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get weekly menu
// @route   GET /api/menu/weekly
// @access  Public
exports.getWeeklyMenu = async (req, res) => {
  try {
    const menus = await Menu.find().sort({ dayIndex: 1 });
    res.json({ success: true, data: menus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a day's menu (Admin Only)
// @route   PUT /api/menu/weekly/:id
// @access  Private/Admin
exports.updateMenuDay = async (req, res) => {
  const { mainDish, sideDish, emoji, calories } = req.body;

  try {
    let menu = await Menu.findById(req.params.id);

    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu day not found' });
    }

    menu.mainDish = mainDish || menu.mainDish;
    menu.sideDish = sideDish || menu.sideDish;
    menu.emoji = emoji || menu.emoji;
    menu.calories = calories || menu.calories;

    await menu.save();

    res.json({ success: true, data: menu });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a review for a menu item
// @route   POST /api/restaurants/:id/items/:itemId/review
// @access  Private
exports.addProductReview = async (req, res) => {
  const { rating, comment } = req.body;
  const { id: restaurantId, itemId } = req.params;

  try {
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const menuItem = restaurant.menuItems.id(itemId);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found in restaurant' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Upsert review
    const review = await ProductReview.findOneAndUpdate(
      { user: req.user.id, itemId },
      {
        restaurant: restaurantId,
        itemId,
        itemName: menuItem.name,
        userName: user.name,
        rating,
        comment: comment || ''
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: 'Review submitted successfully', data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get reviews for a menu item
// @route   GET /api/restaurants/:id/items/:itemId/reviews
// @access  Public
exports.getProductReviews = async (req, res) => {
  const { itemId } = req.params;
  try {
    const reviews = await ProductReview.find({ itemId }).sort({ createdAt: -1 });
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update menu item availability (Admin Only)
// @route   PUT /api/restaurants/:id/items/:itemId/availability
// @access  Private/Admin
exports.updateItemAvailability = async (req, res) => {
  const { isAvailable } = req.body;
  const { id: restaurantId, itemId } = req.params;

  try {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const menuItem = restaurant.menuItems.id(itemId);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    menuItem.isAvailable = isAvailable !== undefined ? isAvailable : !menuItem.isAvailable;
    await restaurant.save();

    // Emit live update so students get availability changes in real-time
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('restaurant_menu_updated', { restaurantId, itemId, isAvailable: menuItem.isAvailable });
    }

    res.json({ success: true, message: 'Availability updated successfully', data: menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add menu item to a restaurant (Admin Only)
// @route   POST /api/restaurants/:id/items
// @access  Private/Admin
exports.addMenuItem = async (req, res) => {
  const { name, description, price, originalPrice, image, isVeg, isAvailable, category } = req.body;

  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }

    restaurant.menuItems.push({
      name,
      description: description || '',
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      isVeg: isVeg !== false,
      isAvailable: isAvailable !== false,
      category: category || 'Popular Dishes'
    });

    await restaurant.save();

    const newItem = restaurant.menuItems[restaurant.menuItems.length - 1];

    // Emit live update so student app receives the new item in real-time
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('restaurant_menu_updated', { restaurantId: restaurant._id, action: 'add', item: newItem });
    }

    res.status(201).json({ success: true, message: 'Menu item added successfully', data: newItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update menu item details (Admin Only)
// @route   PUT /api/restaurants/:id/items/:itemId
// @access  Private/Admin
exports.updateMenuItem = async (req, res) => {
  const { name, description, price, originalPrice, image, isVeg, isAvailable, category } = req.body;
  const { id: restaurantId, itemId } = req.params;

  try {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const menuItem = restaurant.menuItems.id(itemId);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    if (name !== undefined) menuItem.name = name;
    if (description !== undefined) menuItem.description = description;
    if (price !== undefined) menuItem.price = Number(price);
    if (originalPrice !== undefined) {
      menuItem.originalPrice = originalPrice ? Number(originalPrice) : undefined;
    }
    if (image !== undefined) menuItem.image = image;
    if (isVeg !== undefined) menuItem.isVeg = isVeg;
    if (isAvailable !== undefined) menuItem.isAvailable = isAvailable;
    if (category !== undefined) menuItem.category = category;

    await restaurant.save();

    // Emit live update so student app receives the updated item details in real-time
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('restaurant_menu_updated', { restaurantId, itemId, action: 'update', item: menuItem });
    }

    res.json({ success: true, message: 'Menu item updated successfully', data: menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete menu item from a restaurant (Admin Only)
// @route   DELETE /api/restaurants/:id/items/:itemId
// @access  Private/Admin
exports.deleteMenuItem = async (req, res) => {
  const { id: restaurantId, itemId } = req.params;

  try {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const menuItem = restaurant.menuItems.id(itemId);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    restaurant.menuItems.pull(itemId);
    await restaurant.save();

    // Emit live update so student app removes the deleted item in real-time
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('restaurant_menu_updated', { restaurantId, itemId, action: 'delete' });
    }

    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new restaurant (Admin Only)
// @route   POST /api/restaurants
// @access  Private/Admin
exports.createRestaurant = async (req, res) => {
  const { name, cuisine, image, deliveryTime } = req.body;

  try {
    if (!name || !cuisine) {
      return res.status(400).json({ success: false, message: 'Please provide a name and cuisine' });
    }

    const exists = await Restaurant.findOne({ name });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Restaurant name already exists' });
    }

    const restaurant = await Restaurant.create({
      name,
      cuisine,
      image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      deliveryTime: deliveryTime || '20-30 mins',
      menuItems: []
    });

    // Emit live update so student app receives the new restaurant in real-time
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('restaurant_updated', { action: 'create', restaurant });
    }

    res.status(201).json({ success: true, message: 'Restaurant created successfully', data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a restaurant (Admin Only)
// @route   DELETE /api/restaurants/:id
// @access  Private/Admin
exports.deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    await restaurant.deleteOne();

    // Emit live update so student app removes the restaurant in real-time
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('restaurant_updated', { action: 'delete', restaurantId: req.params.id });
    }

    res.json({ success: true, message: 'Restaurant deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
